import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GraphBuilderService } from './graph-builder.service';
import { PriorityQueue } from './priority-queue';
import { RedisService } from '@common/redis/redis.service';
import { Graph, GraphNode } from '@modules/routing/interfaces/graph.interface';
import { RoutePath } from '@modules/routing/interfaces/routing.interface';
import {
    ENUM_WALKING_LEG_TYPE,
    RoutingCriteria,
} from '@modules/routing/enums/routing.enum';
import {
    RoutingResponseDto,
    ParetoOptimalPathDto,
    WalkingLegDto,
} from '@modules/routing/dtos/response/routing.response.dto';
import { RoutingMetricsDto } from '@modules/routing/dtos/response/routing-metrics.dto';
import { RoutingResponseData } from '@modules/routing/interfaces/routing-response.interface';
import {
    GRAPH_CACHE_TTL,
    AVERAGE_BUS_SPEED,
    FARE_PER_BOARDING,
    TRANSFER_WAIT_TIME,
    MINUTES_PER_HOUR,
    CONGESTION_MULTIPLIER,
    NORMAL_TRAFFIC_MULTIPLIER,
    RUSH_HOUR_MORNING_START,
    RUSH_HOUR_MORNING_END,
    RUSH_HOUR_EVENING_START,
    RUSH_HOUR_EVENING_END,
    WEIGHT_CONFIG_FASTEST,
    WEIGHT_CONFIG_CHEAPEST,
    WEIGHT_CONFIG_SHORTEST,
    WEIGHT_CONFIG_BALANCED,
    WALKING_SPEED_KMH,
    CANDIDATE_STATIONS_COUNT,
    MAX_WALKING_DISTANCE_KM,
    MAX_WALKING_DISTANCE_KM_FALLBACK,
    ROUTING_RESULT_CACHE_TTL_SECONDS,
    WALKING_TRANSFER_ROUTE_CODE,
    MAX_TOTAL_WALKING_DISTANCE_KM,
} from '@modules/routing/constants/routing.constants';
import { CongestionFactors } from '@modules/routing/interfaces/congestion-factor.interface';
import { MultiObjectiveWeights } from '@modules/routing/interfaces/multi-objective-weight.interface';
import {
    StationInfo,
    TransferWalkingLeg,
} from '@modules/routing/interfaces/routing.interface';

/**
 * Service chứa thuật toán Multi-Objective A* (MOA*)
 * Cải tiến theo báo cáo nghiên cứu về A* Algorithm
 */
@Injectable()
export class RoutingService {
    private readonly logger = new Logger(RoutingService.name);
    private graphCache: Graph | null = null;
    private graphCacheTime: number = 0;

    /**
     * Congestion factors theo báo cáo nghiên cứu
     * Giờ cao điểm: +20% thời gian
     */
    private readonly congestionFactors: CongestionFactors = {
        rushHourMorning: Array.from(
            { length: RUSH_HOUR_MORNING_END - RUSH_HOUR_MORNING_START },
            (_, i) => RUSH_HOUR_MORNING_START + i,
        ),
        rushHourEvening: Array.from(
            { length: RUSH_HOUR_EVENING_END - RUSH_HOUR_EVENING_START },
            (_, i) => RUSH_HOUR_EVENING_START + i,
        ),
        normal: NORMAL_TRAFFIC_MULTIPLIER,
    };

    constructor(
        private readonly graphBuilder: GraphBuilderService,
        private readonly redisService: RedisService,
    ) {}

    /**
     * @description Tạo cache key cho kết quả routing.
     *
     * Nhóm timeOfDay theo traffic bucket để tăng cache hit rate:
     *  - Trong cùng 1 bucket (rush / normal), kết quả routing là như nhau
     *    vì congestion multiplier không thay đổi trong bucket đó.
     * để phân biệt request mà vẫn gom được các request gần nhau.
     */
    private buildRoutingCacheKey(
        from: {
            stationCode?: string;
            coordinates?: { latitude: number; longitude: number };
        },
        to: {
            stationCode?: string;
            coordinates?: { latitude: number; longitude: number };
        },
        weights: MultiObjectiveWeights,
        numPaths: number,
        maxTransfers?: number,
        timeOfDay?: number,
        congestionAware?: boolean,
    ): string {
        const fromKey =
            from.stationCode ??
            `${from.coordinates!.latitude.toFixed(4)}_${from.coordinates!.longitude.toFixed(4)}`;
        const toKey =
            to.stationCode ??
            `${to.coordinates!.latitude.toFixed(4)}_${to.coordinates!.longitude.toFixed(4)}`;

        const effectiveHour = timeOfDay ?? new Date().getHours();
        const trafficBucket = !congestionAware
            ? 'nc'
            : effectiveHour >= RUSH_HOUR_MORNING_START &&
                effectiveHour < RUSH_HOUR_MORNING_END
              ? 'rm'
              : effectiveHour >= RUSH_HOUR_EVENING_START &&
                  effectiveHour < RUSH_HOUR_EVENING_END
                ? 're'
                : 'n';

        const wKey = `${weights.timeWeight.toFixed(2)}.${weights.costWeight.toFixed(5)}.${weights.distanceWeight.toFixed(3)}`;
        const mKey = maxTransfers !== undefined ? `m${maxTransfers}` : 'ma';

        return `routing:result:${fromKey}:${toKey}:${wKey}:n${numPaths}:${mKey}:${trafficBucket}`;
    }

    /**
     * Lấy hoặc build graph (có cache)
     */
    private async getGraph(): Promise<Graph> {
        const now = Date.now();
        if (this.graphCache && now - this.graphCacheTime < GRAPH_CACHE_TTL) {
            return this.graphCache;
        }

        this.graphCache = await this.graphBuilder.buildGraph();
        this.graphCacheTime = now;
        return this.graphCache;
    }

    /**
     * Tính congestion factor dựa trên giờ trong ngày
     * Theo báo cáo nghiên cứu: +20% thời gian trong giờ cao điểm
     */
    private getCongestionFactor(timeOfDay?: number): number {
        if (timeOfDay === undefined) {
            timeOfDay = new Date().getHours();
        }

        if (this.congestionFactors.rushHourMorning.includes(timeOfDay)) {
            return CONGESTION_MULTIPLIER;
        }

        if (this.congestionFactors.rushHourEvening.includes(timeOfDay)) {
            return CONGESTION_MULTIPLIER;
        }

        return this.congestionFactors.normal;
    }

    /**
     * Đếm số lần chuyển tuyến dựa trên danh sách segments
     */
    private countTransfersFromSegments(
        segments: RoutePath['segments'],
    ): number {
        let transfers = 0;
        let previousRoute: string | undefined = undefined;

        for (const segment of segments) {
            if (
                previousRoute !== undefined &&
                previousRoute !== segment.routeCode
            ) {
                transfers++;
            }
            previousRoute = segment.routeCode;
        }

        return transfers;
    }

    /**
     * Tái tạo đường đi từ cameFrom map.
     *
     * Tách biệt bus segments và walking transfer legs:
     * - segments: chỉ chứa các đoạn xe buýt
     * - transferWalkingLegs: các đoạn đi bộ chuyển tuyến giữa 2 trạm
     *
     * totalTime/totalDistance trong RoutePath trả về chỉ là phần xe buýt
     * (chưa có congestion). Caller sẽ cộng thêm walking và áp dụng congestion.
     */
    private reconstructPath(
        graph: Graph,
        cameFrom: Map<
            string,
            { node: string; routeCode?: string; isWalkingEdge?: boolean }
        >,
        currentCode: string,
        startCode: string,
        criteria: RoutingCriteria,
        maxTransfers?: number,
    ): RoutePath | null {
        const fullPath: string[] = [];
        const busSegments: RoutePath['segments'] = [];
        const transferWalkingLegs: TransferWalkingLeg[] = [];

        let current = currentCode;

        // Xây dựng path ngược từ goal về start
        while (current) {
            fullPath.unshift(current);
            const prev = cameFrom.get(current);

            if (prev?.node) {
                const fromNode = graph.nodes.get(prev.node)!;
                const edges = fromNode.neighbors.get(current);
                const edge =
                    edges?.find((e) => e.routeCode === prev.routeCode) ??
                    edges?.[0];

                if (edge) {
                    if (edge.isWalkingEdge) {
                        const toNode = graph.nodes.get(current)!;
                        transferWalkingLegs.unshift({
                            fromStationCode: prev.node,
                            fromStationName:
                                fromNode.station.stationName ?? '',
                            toStationCode: current,
                            toStationName: toNode.station.stationName ?? '',
                            fromCoordinates: {
                                latitude: fromNode.station.latitude,
                                longitude: fromNode.station.longitude,
                            },
                            toCoordinates: {
                                latitude: toNode.station.latitude,
                                longitude: toNode.station.longitude,
                            },
                            distanceKm: edge.distance,
                            estimatedTimeMinutes:
                                (edge.distance / WALKING_SPEED_KMH) *
                                MINUTES_PER_HOUR,
                        });
                    } else {
                        busSegments.unshift({
                            from: prev.node,
                            to: current,
                            routeCode: edge.routeCode,
                            routeName: edge.route.routeName ?? '',
                            distance: edge.distance,
                            time: this.graphBuilder.calculateWeight(
                                edge,
                                RoutingCriteria.TIME,
                            ),
                            cost: 0,
                        });
                    }
                }
            }

            const prev2 = cameFrom.get(current);
            if (!prev2) break;
            current = prev2.node;
        }

        // Tính chi phí theo model xe buýt Việt Nam:
        // Giá vé CỐ ĐỊNH mỗi lần lên xe, chỉ tính khi routeCode thay đổi.
        let currentRouteCode: string | undefined = undefined;
        for (const segment of busSegments) {
            const isNewBoarding = segment.routeCode !== currentRouteCode;
            segment.cost = isNewBoarding ? FARE_PER_BOARDING : 0;
            currentRouteCode = segment.routeCode;
        }

        // Kiểm tra maxTransfers dựa trên bus-to-bus route changes (không tính walking)
        const transfers = this.countTransfersFromSegments(busSegments);
        if (maxTransfers !== undefined && transfers > maxTransfers) {
            return null;
        }

        // Lọc sớm nếu tổng walking transfer vượt ngưỡng cho phép.
        // Caller sẽ cộng thêm walking đầu/cuối và kiểm tra lần nữa nếu cần.
        const transferWalkingTotal = transferWalkingLegs.reduce(
            (sum, leg) => sum + leg.distanceKm,
            0,
        );
        if (transferWalkingTotal > MAX_TOTAL_WALKING_DISTANCE_KM) {
            return null;
        }

        // Tổng hợp chỉ từ bus segments (walking sẽ được cộng thêm bởi caller)
        let totalDistance = 0;
        let totalTime = 0;
        let totalCost = 0;
        for (const seg of busSegments) {
            totalDistance += seg.distance;
            totalTime += seg.time;
            totalCost += seg.cost;
        }

        const stations = fullPath.map((code) => {
            const node = graph.nodes.get(code)!;
            return {
                stationCode: node.stationCode,
                stationName: node.station.stationName ?? '',
                coordinates: {
                    latitude: node.station.latitude,
                    longitude: node.station.longitude,
                },
            };
        });

        // Routes chỉ từ bus segments
        const routeMap = new Map<string, { routeCode: string; routeName: string }>();
        for (const seg of busSegments) {
            if (!routeMap.has(seg.routeCode)) {
                routeMap.set(seg.routeCode, {
                    routeCode: seg.routeCode,
                    routeName: seg.routeName,
                });
            }
        }

        return {
            stations,
            routes: Array.from(routeMap.values()),
            totalDistance,
            totalTime,
            totalCost,
            segments: busSegments,
            transferWalkingLegs,
        };
    }

    /**
     * Multi-Objective A* (MOA*) - Tìm nhiều lộ trình tối ưu Pareto
     * Theo báo cáo nghiên cứu: trả về 3-5 lựa chọn với trade-offs khác nhau
     * Chi phí tính toán thêm 20-30% nhưng cung cấp nhiều lựa chọn tốt
     */
    async findPaths(
        fromStationCode: string,
        toStationCode: string,
        weights: MultiObjectiveWeights,
        numPaths: number = 3,
        maxTransfers?: number,
        timeOfDay?: number,
        congestionAware: boolean = true,
    ): Promise<RoutingResponseData> {
        const startTime = Date.now();
        const graph = await this.getGraph();
        const cacheHit = this.graphCache !== null;

        const startNode = graph.nodes.get(fromStationCode);
        const goalNode = graph.nodes.get(toStationCode);

        if (!startNode) {
            throw new NotFoundException(
                `Station with code ${fromStationCode} not found`,
            );
        }

        if (!goalNode) {
            throw new NotFoundException(
                `Station with code ${toStationCode} not found`,
            );
        }

        // Tính congestion factor
        const congestionFactor = congestionAware
            ? this.getCongestionFactor(timeOfDay)
            : NORMAL_TRAFFIC_MULTIPLIER;

        // Normalize weights và lấy tất cả weight configs
        const normalizedWeights = this.normalizeWeights(weights);
        const configsToUse = this.getWeightConfigsToUse(normalizedWeights);

        const paths: ParetoOptimalPathDto[] = [];
        let nodesExplored = 0;

        for (const config of configsToUse) {
            const path = await this.findPathWithMultiObjectiveWeights(
                fromStationCode,
                toStationCode,
                config.weights,
                maxTransfers,
                congestionFactor,
                graph,
            );

            if (path) {
                nodesExplored += path.nodesExplored || 0;

                const optimizationScore = this.calculateOptimizationScore(
                    config.weights,
                    path.totalTime,
                    path.totalCost,
                    path.totalDistance,
                );

                const transferWalkingDtos = (
                    path.transferWalkingLegs ?? []
                ).map((leg) => this.transferWalkingLegToDto(leg));

                const totalWalkingDistanceKm =
                    path.transferWalkingLegs?.reduce(
                        (sum, l) => sum + l.distanceKm,
                        0,
                    ) ?? 0;
                const totalWalkingTimeMinutes =
                    path.transferWalkingLegs?.reduce(
                        (sum, l) => sum + l.estimatedTimeMinutes,
                        0,
                    ) ?? 0;

                paths.push({
                    stations: path.stations.map((s) =>
                        this.mapStationInfo(s),
                    ),
                    routes: path.routes,
                    totalDistance: path.totalDistance,
                    totalTime: path.totalTime,
                    totalCost: path.totalCost,
                    transfers: this.countTransfersFromSegments(path.segments),
                    segments: path.segments,
                    optimizationScore,
                    optimizationType: config.type,
                    ...(transferWalkingDtos.length > 0 && {
                        walkingLegs: transferWalkingDtos,
                        totalWalkingDistanceKm,
                        totalWalkingTimeMinutes,
                        transitDistanceKm:
                            path.totalDistance - totalWalkingDistanceKm,
                        transitTimeMinutes:
                            path.totalTime - totalWalkingTimeMinutes,
                    }),
                });
            }
        }

        // Loại bỏ duplicates, sort theo score, lấy top numPaths
        const uniquePaths = this.removeDuplicatePaths(paths);
        uniquePaths.sort((a, b) => a.optimizationScore - b.optimizationScore);
        const finalPaths = uniquePaths.slice(0, numPaths);

        const executionTime = Date.now() - startTime;

        const metrics: RoutingMetricsDto = {
            algorithm: 'MOA*',
            executionTimeMs: executionTime,
            nodesExplored,
            explorationRatePercent: (nodesExplored / graph.nodes.size) * 100,
            heuristicUsed: true,
            hasFallback: false,
            cacheHit,
        };

        this.logger.debug(
            `MOA* found ${finalPaths.length} Pareto-optimal paths in ${executionTime}ms, explored ${nodesExplored} nodes`,
        );

        return {
            paths: finalPaths,
            metrics,
            congestionApplied: congestionAware && congestionFactor !== 1.0,
            timeOfDay: timeOfDay ?? new Date().getHours(),
        };
    }

    /**
     * Helper tìm path với multi-objective weights cụ thể.
     *
     * Xử lý 2 loại cạnh trong đồ thị:
     * - Bus edge: tính theo bus speed, congestion, fare khi lên xe
     * - Walking edge (isWalkingEdge): tính theo walking speed, không có fare,
     *   không có congestion — cho phép chuyển tuyến qua đi bộ ngắn
     *
     * Ràng buộc: không đi bộ liên tiếp 2 lần (phải lên xe trước khi đi bộ tiếp).
     */
    private async findPathWithMultiObjectiveWeights(
        fromStationCode: string,
        toStationCode: string,
        weights: MultiObjectiveWeights,
        maxTransfers: number | undefined,
        congestionFactor: number,
        graph: Graph,
    ): Promise<(RoutePath & { nodesExplored?: number }) | null> {
        const startNode = graph.nodes.get(fromStationCode)!;
        const goalNode = graph.nodes.get(toStationCode)!;

        // Heuristic đa tiêu chí — admissible vì dùng bus speed (nhanh hơn walking)
        const multiObjectiveHeuristic = (
            from: GraphNode,
            to: GraphNode,
        ): number => {
            if (
                !from.station.latitude ||
                !from.station.longitude ||
                !to.station.latitude ||
                !to.station.longitude
            ) {
                return 0;
            }

            const distance = this.graphBuilder.calculateDistance(
                from.station.latitude,
                from.station.longitude,
                to.station.latitude,
                to.station.longitude,
            );

            // Dùng bus speed để ước tính → lower bound → admissible
            const time = (distance / AVERAGE_BUS_SPEED) * MINUTES_PER_HOUR;
            return (
                weights.timeWeight * time + weights.distanceWeight * distance
            );
        };

        const initialHeuristic = multiObjectiveHeuristic(startNode, goalNode);

        const openSet = new PriorityQueue<{
            stationCode: string;
            fScore: number;
        }>((a, b) => a.fScore - b.fScore);

        const openSetMap = new Map<string, boolean>();
        const closedSet = new Set<string>();
        const gScore = new Map<string, number>();
        gScore.set(fromStationCode, 0);

        const fScore = new Map<string, number>();
        fScore.set(fromStationCode, initialHeuristic);

        const cameFrom = new Map<
            string,
            { node: string; routeCode?: string; isWalkingEdge?: boolean }
        >();

        openSet.insert({
            stationCode: fromStationCode,
            fScore: initialHeuristic,
        });
        openSetMap.set(fromStationCode, true);

        let nodesExplored = 0;

        while (!openSet.isEmpty()) {
            let current = openSet.extractMin();
            if (!current) break;

            while (current && closedSet.has(current.stationCode)) {
                current = openSet.extractMin();
                if (!current) break;
            }

            if (!current) break;

            const currentCode = current.stationCode;
            const currentNode = graph.nodes.get(currentCode)!;

            const currentFScore = fScore.get(currentCode) ?? Infinity;
            if (current.fScore !== currentFScore) {
                continue;
            }

            openSetMap.delete(currentCode);

            if (currentCode === toStationCode) {
                const path = this.reconstructPath(
                    graph,
                    cameFrom,
                    currentCode,
                    fromStationCode,
                    RoutingCriteria.DISTANCE,
                    maxTransfers,
                );

                if (path) {
                    // Tính tổng thời gian và khoảng cách walking transfer
                    const walkTransferTime =
                        path.transferWalkingLegs?.reduce(
                            (sum, leg) => sum + leg.estimatedTimeMinutes,
                            0,
                        ) ?? 0;
                    const walkTransferDistance =
                        path.transferWalkingLegs?.reduce(
                            (sum, leg) => sum + leg.distanceKm,
                            0,
                        ) ?? 0;

                    const adjustedPath: RoutePath & { nodesExplored?: number } =
                        {
                            ...path,
                            // Bus time với congestion + walking time không chịu congestion
                            totalTime:
                                path.totalTime * congestionFactor +
                                walkTransferTime,
                            totalDistance:
                                path.totalDistance + walkTransferDistance,
                            segments: path.segments.map((seg) => ({
                                ...seg,
                                time: seg.time * congestionFactor,
                            })),
                            nodesExplored,
                        };

                    return adjustedPath;
                }
            }

            closedSet.add(currentCode);
            nodesExplored++;

            const previousRouteCode = cameFrom.get(currentCode)?.routeCode;
            const previousIsWalking =
                previousRouteCode === WALKING_TRANSFER_ROUTE_CODE;

            for (const [
                neighborCode,
                edges,
            ] of currentNode.neighbors.entries()) {
                if (closedSet.has(neighborCode)) continue;

                const neighbor = graph.nodes.get(neighborCode)!;

                for (const edge of edges) {
                    // Không cho đi bộ liên tiếp 2 lần — phải lên xe giữa 2 đoạn đi bộ
                    if (edge.isWalkingEdge && previousIsWalking) continue;

                    const edgeDistance = edge.distance;
                    let edgeTime: number;
                    let edgeCost: number;

                    if (edge.isWalkingEdge) {
                        // Đi bộ: walking speed, không có congestion, không có fare
                        edgeTime =
                            (edgeDistance / WALKING_SPEED_KMH) *
                            MINUTES_PER_HOUR;
                        edgeCost = 0;
                    } else {
                        // Xe buýt: phát hiện chuyển tuyến (bus-to-bus hoặc sau walking)
                        const isBusToBusTransfer =
                            !previousIsWalking &&
                            previousRouteCode !== undefined &&
                            previousRouteCode !== edge.routeCode;
                        const isFirstBoarding = previousRouteCode === undefined;
                        const isNewBoarding =
                            isFirstBoarding ||
                            isBusToBusTransfer ||
                            previousIsWalking;

                        edgeTime =
                            (edgeDistance / AVERAGE_BUS_SPEED) *
                                MINUTES_PER_HOUR *
                                congestionFactor +
                            (isBusToBusTransfer ? TRANSFER_WAIT_TIME : 0);
                        edgeCost = isNewBoarding ? FARE_PER_BOARDING : 0;
                    }

                    const edgeWeight =
                        weights.timeWeight * edgeTime +
                        weights.costWeight * edgeCost +
                        weights.distanceWeight * edgeDistance;

                    const tentativeGScore =
                        (gScore.get(currentCode) ?? Infinity) + edgeWeight;

                    if (tentativeGScore < (gScore.get(neighborCode) ?? Infinity)) {
                        cameFrom.set(neighborCode, {
                            node: currentCode,
                            routeCode: edge.routeCode,
                            isWalkingEdge: edge.isWalkingEdge,
                        });
                        gScore.set(neighborCode, tentativeGScore);

                        const h = multiObjectiveHeuristic(neighbor, goalNode);
                        const f = tentativeGScore + h;
                        fScore.set(neighborCode, f);

                        openSet.insert({
                            stationCode: neighborCode,
                            fScore: f,
                        });
                        openSetMap.set(neighborCode, true);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Chuyển TransferWalkingLeg (internal interface) thành WalkingLegDto
     * để đưa vào response
     */
    private transferWalkingLegToDto(leg: TransferWalkingLeg): WalkingLegDto {
        return {
            type: ENUM_WALKING_LEG_TYPE.TRANSFER,
            fromCoordinates: leg.fromCoordinates,
            toCoordinates: leg.toCoordinates,
            stationCode: leg.toStationCode,
            stationName: leg.toStationName,
            fromStationCode: leg.fromStationCode,
            fromStationName: leg.fromStationName,
            distanceKm: leg.distanceKm,
            estimatedTimeMinutes: leg.estimatedTimeMinutes,
        };
    }

    /**
     * Loại bỏ các paths trùng lặp (cùng stations và routes)
     */
    private removeDuplicatePaths(
        paths: ParetoOptimalPathDto[],
    ): ParetoOptimalPathDto[] {
        const seen = new Set<string>();
        const unique: ParetoOptimalPathDto[] = [];

        for (const path of paths) {
            const key = path.stations.map((s) => s.stationCode).join('->');
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(path);
            }
        }

        return unique;
    }

    /**
     * Tìm top-N trạm gần nhất từ tọa độ, sắp xếp theo khoảng cách tăng dần.
     *
     * Chiến lược lọc khoảng cách đi bộ:
     *  1. Ưu tiên các trạm trong bán kính MAX_WALKING_DISTANCE_KM (1 km).
     *  2. Nếu không có trạm nào trong bán kính đó, fallback lên
     *     MAX_WALKING_DISTANCE_KM_FALLBACK (3 km) để vẫn trả về kết quả.
     *  3. Nếu vẫn không có, trả về trạm gần nhất tuyệt đối (tránh lỗi).
     */
    async findTopNNearestStations(
        latitude: number,
        longitude: number,
        n: number = CANDIDATE_STATIONS_COUNT,
    ): Promise<
        Array<{
            stationCode: string;
            stationName: string;
            distanceKm: number;
            latitude: number;
            longitude: number;
        }>
    > {
        const graph = await this.getGraph();
        const allCandidates: Array<{
            stationCode: string;
            stationName: string;
            distanceKm: number;
            latitude: number;
            longitude: number;
        }> = [];

        for (const [stationCode, node] of graph.nodes.entries()) {
            if (!node.station.latitude || !node.station.longitude) continue;

            const distanceKm = this.graphBuilder.calculateDistance(
                latitude,
                longitude,
                node.station.latitude,
                node.station.longitude,
            );

            allCandidates.push({
                stationCode,
                stationName: node.station.stationName ?? '',
                distanceKm,
                latitude: node.station.latitude,
                longitude: node.station.longitude,
            });
        }

        allCandidates.sort((a, b) => a.distanceKm - b.distanceKm);

        // Lọc theo bán kính ưu tiên, fallback nếu cần
        const withinPreferred = allCandidates.filter(
            (c) => c.distanceKm <= MAX_WALKING_DISTANCE_KM,
        );
        if (withinPreferred.length >= 1) {
            return withinPreferred.slice(0, n);
        }

        const withinFallback = allCandidates.filter(
            (c) => c.distanceKm <= MAX_WALKING_DISTANCE_KM_FALLBACK,
        );
        if (withinFallback.length >= 1) {
            this.logger.warn(
                `No station within ${MAX_WALKING_DISTANCE_KM}km, ` +
                    `falling back to ${MAX_WALKING_DISTANCE_KM_FALLBACK}km radius ` +
                    `(nearest: ${allCandidates[0]?.distanceKm.toFixed(2)}km)`,
            );
            return withinFallback.slice(0, n);
        }

        // Fallback tuyệt đối: trả về trạm gần nhất dù xa đến đâu
        this.logger.warn(
            `No station within fallback radius ${MAX_WALKING_DISTANCE_KM_FALLBACK}km, ` +
                `returning absolute nearest (${allCandidates[0]?.distanceKm.toFixed(2)}km)`,
        );
        return allCandidates.slice(0, n);
    }

    /**
     * Tìm trạm gần nhất từ tọa độ (backward compat)
     */
    async findNearestStation(
        latitude: number,
        longitude: number,
    ): Promise<string | null> {
        const candidates = await this.findTopNNearestStations(
            latitude,
            longitude,
            1,
        );
        return candidates[0]?.stationCode ?? null;
    }

    /**
     * Tạo walking leg từ tọa độ người dùng đến/từ một trạm
     */
    private buildWalkingLegInternal(
        type: ENUM_WALKING_LEG_TYPE,
        userCoords: { latitude: number; longitude: number },
        station: {
            stationCode: string;
            stationName: string;
            latitude: number;
            longitude: number;
        },
    ): WalkingLegDto {
        const distanceKm = this.graphBuilder.calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            station.latitude,
            station.longitude,
        );
        const estimatedTimeMinutes =
            (distanceKm / WALKING_SPEED_KMH) * MINUTES_PER_HOUR;

        return {
            type,
            fromCoordinates:
                type === ENUM_WALKING_LEG_TYPE.TO_FIRST_STATION
                    ? {
                          latitude: userCoords.latitude,
                          longitude: userCoords.longitude,
                      }
                    : {
                          latitude: station.latitude,
                          longitude: station.longitude,
                      },
            toCoordinates:
                type === ENUM_WALKING_LEG_TYPE.TO_FIRST_STATION
                    ? {
                          latitude: station.latitude,
                          longitude: station.longitude,
                      }
                    : {
                          latitude: userCoords.latitude,
                          longitude: userCoords.longitude,
                      },
            stationCode: station.stationCode,
            stationName: station.stationName,
            distanceKm,
            estimatedTimeMinutes,
        };
    }

    /**
     * Tạo walking leg từ tọa độ người dùng đến/từ một trạm theo stationCode
     * Dùng cho mixed case (stationCode một bên, coordinates bên còn lại)
     */
    async buildWalkingLeg(
        type: ENUM_WALKING_LEG_TYPE,
        userCoords: { latitude: number; longitude: number },
        stationCode: string,
    ): Promise<WalkingLegDto | null> {
        const graph = await this.getGraph();
        const node = graph.nodes.get(stationCode);
        if (!node?.station.latitude || !node?.station.longitude) return null;

        return this.buildWalkingLegInternal(type, userCoords, {
            stationCode,
            stationName: node.station.stationName ?? '',
            latitude: node.station.latitude,
            longitude: node.station.longitude,
        });
    }

    /**
     * Tìm đường từ tọa độ người dùng với multi-station selection và walking legs.
     *
     * Thay vì cố định 1 trạm gần nhất, phương thức này xem xét top-N trạm
     * gần nhất ở cả 2 đầu, chạy MOA* cho mọi tổ hợp, tính cả đoạn đi bộ
     * vào tổng chi phí, rồi trả về numPaths lộ trình tốt nhất toàn cục.
     */
    async findPathsFromCoordinates(
        fromLat: number,
        fromLon: number,
        toLat: number,
        toLon: number,
        weights: MultiObjectiveWeights,
        numPaths: number = 3,
        maxTransfers?: number,
        timeOfDay?: number,
        congestionAware: boolean = true,
    ): Promise<RoutingResponseData> {
        const startTime = Date.now();
        const graph = await this.getGraph();
        const cacheHit = this.graphCache !== null;

        const congestionFactor = congestionAware
            ? this.getCongestionFactor(timeOfDay)
            : NORMAL_TRAFFIC_MULTIPLIER;

        const normalizedWeights = this.normalizeWeights(weights);

        const allConfigs = this.getWeightConfigsToUse(normalizedWeights);

        const fromCandidates = await this.findTopNNearestStations(
            fromLat,
            fromLon,
            CANDIDATE_STATIONS_COUNT,
        );
        const toCandidates = await this.findTopNNearestStations(
            toLat,
            toLon,
            CANDIDATE_STATIONS_COUNT,
        );

        if (fromCandidates.length === 0) {
            throw new NotFoundException(
                'Không tìm thấy trạm nào gần điểm xuất phát',
            );
        }
        if (toCandidates.length === 0) {
            throw new NotFoundException(
                'Không tìm thấy trạm nào gần điểm đích',
            );
        }

        const allPaths: ParetoOptimalPathDto[] = [];
        let totalNodesExplored = 0;

        for (const fromCandidate of fromCandidates) {
            for (const toCandidate of toCandidates) {
                if (fromCandidate.stationCode === toCandidate.stationCode)
                    continue;

                const walkingFromLeg = this.buildWalkingLegInternal(
                    ENUM_WALKING_LEG_TYPE.TO_FIRST_STATION,
                    { latitude: fromLat, longitude: fromLon },
                    fromCandidate,
                );
                const walkingToLeg = this.buildWalkingLegInternal(
                    ENUM_WALKING_LEG_TYPE.FROM_LAST_STATION,
                    { latitude: toLat, longitude: toLon },
                    toCandidate,
                );

                const totalWalkingDistanceKm =
                    walkingFromLeg.distanceKm + walkingToLeg.distanceKm;
                const totalWalkingTimeMinutes =
                    walkingFromLeg.estimatedTimeMinutes +
                    walkingToLeg.estimatedTimeMinutes;

                for (const config of allConfigs) {
                    const path = await this.findPathWithMultiObjectiveWeights(
                        fromCandidate.stationCode,
                        toCandidate.stationCode,
                        config.weights,
                        maxTransfers,
                        congestionFactor,
                        graph,
                    );

                    if (path) {
                        totalNodesExplored += path.nodesExplored ?? 0;

                        const transferWalkingDtos = (
                            path.transferWalkingLegs ?? []
                        ).map((leg) => this.transferWalkingLegToDto(leg));

                        const inPathWalkingDistanceKm =
                            path.transferWalkingLegs?.reduce(
                                (sum, l) => sum + l.distanceKm,
                                0,
                            ) ?? 0;
                        const inPathWalkingTimeMinutes =
                            path.transferWalkingLegs?.reduce(
                                (sum, l) => sum + l.estimatedTimeMinutes,
                                0,
                            ) ?? 0;

                        const allWalkingDistanceKm =
                            totalWalkingDistanceKm + inPathWalkingDistanceKm;
                        const allWalkingTimeMinutes =
                            totalWalkingTimeMinutes + inPathWalkingTimeMinutes;

                        // Loại bỏ lộ trình có tổng đi bộ vượt ngưỡng cho phép
                        if (allWalkingDistanceKm > MAX_TOTAL_WALKING_DISTANCE_KM) {
                            continue;
                        }

                        const totalDistance =
                            path.totalDistance + allWalkingDistanceKm;
                        const totalTime =
                            path.totalTime + allWalkingTimeMinutes;

                        const optimizationScore =
                            this.calculateOptimizationScore(
                                config.weights,
                                totalTime,
                                path.totalCost,
                                totalDistance,
                            );

                        const allWalkingLegs: WalkingLegDto[] = [
                            walkingFromLeg,
                            ...transferWalkingDtos,
                            walkingToLeg,
                        ];

                        allPaths.push({
                            stations: path.stations.map((s) =>
                                this.mapStationInfo(s),
                            ),
                            routes: path.routes,
                            totalDistance,
                            totalTime,
                            totalCost: path.totalCost,
                            transfers: this.countTransfersFromSegments(
                                path.segments,
                            ),
                            segments: path.segments,
                            optimizationScore,
                            optimizationType: config.type,
                            walkingLegs: allWalkingLegs,
                            totalWalkingDistanceKm: allWalkingDistanceKm,
                            totalWalkingTimeMinutes: allWalkingTimeMinutes,
                            transitDistanceKm: path.totalDistance,
                            transitTimeMinutes: path.totalTime,
                        });
                    }
                }
            }
        }

        const uniquePaths = this.removeDuplicatePaths(allPaths);
        uniquePaths.sort((a, b) => a.optimizationScore - b.optimizationScore);
        const finalPaths = uniquePaths.slice(0, numPaths);

        const executionTime = Date.now() - startTime;

        const metrics: RoutingMetricsDto = {
            algorithm: 'MOA*+Walking',
            executionTimeMs: executionTime,
            nodesExplored: totalNodesExplored,
            explorationRatePercent:
                graph.nodes.size > 0
                    ? (totalNodesExplored / graph.nodes.size) * 100
                    : 0,
            heuristicUsed: true,
            hasFallback: false,
            cacheHit,
        };

        this.logger.debug(
            `MOA*+Walking: ${finalPaths.length} paths in ${executionTime}ms, ` +
                `${totalNodesExplored} nodes explored, ` +
                `${fromCandidates.length}×${toCandidates.length} station pairs considered`,
        );

        return {
            paths: finalPaths,
            metrics,
            congestionApplied: congestionAware && congestionFactor !== 1.0,
            timeOfDay: timeOfDay ?? new Date().getHours(),
        };
    }

    /**
     * Phương thức thống nhất cho tất cả input types (tọa độ, mã trạm, mixed).
     *
     * Mỗi đầu có thể là stationCode (đã biết) hoặc tọa độ (cần tìm top-N gần nhất).
     * Chạy MOA* cho tất cả tổ hợp, tính walking leg khi cần, trả về top numPaths.
     */
    async findPathsUnified(
        from: {
            stationCode?: string;
            coordinates?: { latitude: number; longitude: number };
        },
        to: {
            stationCode?: string;
            coordinates?: { latitude: number; longitude: number };
        },
        weights: MultiObjectiveWeights,
        numPaths: number = 3,
        maxTransfers?: number,
        timeOfDay?: number,
        congestionAware: boolean = true,
    ): Promise<RoutingResponseData> {
        const startTime = Date.now();

        // ── Redis cache check ──────────────────────────────────────────────────
        const cacheKey = this.buildRoutingCacheKey(
            from,
            to,
            weights,
            numPaths,
            maxTransfers,
            timeOfDay,
            congestionAware,
        );

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const result = JSON.parse(cached) as RoutingResponseData;
            this.logger.debug(
                `Routing result cache HIT: ${cacheKey} (${Date.now() - startTime}ms)`,
            );
            result.metrics = {
                ...result.metrics,
                cacheHit: true,
                executionTimeMs: Date.now() - startTime,
            };
            return result;
        }
        // ──────────────────────────────────────────────────────────────────────

        const graph = await this.getGraph();
        const cacheHit = this.graphCache !== null;

        const congestionFactor = congestionAware
            ? this.getCongestionFactor(timeOfDay)
            : NORMAL_TRAFFIC_MULTIPLIER;

        const normalizedWeights = this.normalizeWeights(weights);
        const allConfigs = this.getWeightConfigsToUse(normalizedWeights);

        // Resolve candidates cho mỗi đầu
        const fromCandidates: Array<{
            stationCode: string;
            stationName: string;
            distanceKm: number;
            latitude: number;
            longitude: number;
        }> = from.stationCode
            ? (() => {
                  const node = graph.nodes.get(from.stationCode!);
                  return [
                      {
                          stationCode: from.stationCode!,
                          stationName: node?.station.stationName ?? '',
                          distanceKm: 0,
                          latitude: node?.station.latitude ?? 0,
                          longitude: node?.station.longitude ?? 0,
                      },
                  ];
              })()
            : await this.findTopNNearestStations(
                  from.coordinates!.latitude,
                  from.coordinates!.longitude,
              );

        const toCandidates: Array<{
            stationCode: string;
            stationName: string;
            distanceKm: number;
            latitude: number;
            longitude: number;
        }> = to.stationCode
            ? (() => {
                  const node = graph.nodes.get(to.stationCode!);
                  return [
                      {
                          stationCode: to.stationCode!,
                          stationName: node?.station.stationName ?? '',
                          distanceKm: 0,
                          latitude: node?.station.latitude ?? 0,
                          longitude: node?.station.longitude ?? 0,
                      },
                  ];
              })()
            : await this.findTopNNearestStations(
                  to.coordinates!.latitude,
                  to.coordinates!.longitude,
              );

        if (fromCandidates.length === 0) {
            throw new NotFoundException(
                'Không tìm thấy trạm nào gần điểm xuất phát',
            );
        }
        if (toCandidates.length === 0) {
            throw new NotFoundException(
                'Không tìm thấy trạm nào gần điểm đích',
            );
        }

        const allPaths: ParetoOptimalPathDto[] = [];
        let totalNodesExplored = 0;

        for (const fromCandidate of fromCandidates) {
            for (const toCandidate of toCandidates) {
                if (fromCandidate.stationCode === toCandidate.stationCode)
                    continue;

                // Walking leg chỉ tạo khi phía đó dùng tọa độ (không phải stationCode cố định)
                const walkingFromLeg =
                    from.coordinates && !from.stationCode
                        ? this.buildWalkingLegInternal(
                              ENUM_WALKING_LEG_TYPE.TO_FIRST_STATION,
                              from.coordinates,
                              fromCandidate,
                          )
                        : null;

                const walkingToLeg =
                    to.coordinates && !to.stationCode
                        ? this.buildWalkingLegInternal(
                              ENUM_WALKING_LEG_TYPE.FROM_LAST_STATION,
                              to.coordinates,
                              toCandidate,
                          )
                        : null;

                const totalWalkingDistanceKm =
                    (walkingFromLeg?.distanceKm ?? 0) +
                    (walkingToLeg?.distanceKm ?? 0);
                const totalWalkingTimeMinutes =
                    (walkingFromLeg?.estimatedTimeMinutes ?? 0) +
                    (walkingToLeg?.estimatedTimeMinutes ?? 0);

                for (const config of allConfigs) {
                    const path = await this.findPathWithMultiObjectiveWeights(
                        fromCandidate.stationCode,
                        toCandidate.stationCode,
                        config.weights,
                        maxTransfers,
                        congestionFactor,
                        graph,
                    );

                    if (path) {
                        totalNodesExplored += path.nodesExplored ?? 0;

                        // Walking transfer legs trong hành trình (giữa các trạm)
                        const transferWalkingDtos = (
                            path.transferWalkingLegs ?? []
                        ).map((leg) => this.transferWalkingLegToDto(leg));

                        const inPathWalkingDistanceKm =
                            path.transferWalkingLegs?.reduce(
                                (sum, l) => sum + l.distanceKm,
                                0,
                            ) ?? 0;
                        const inPathWalkingTimeMinutes =
                            path.transferWalkingLegs?.reduce(
                                (sum, l) => sum + l.estimatedTimeMinutes,
                                0,
                            ) ?? 0;

                        // Tổng walking = đầu + giữa hành trình + cuối
                        const allWalkingDistanceKm =
                            totalWalkingDistanceKm + inPathWalkingDistanceKm;
                        const allWalkingTimeMinutes =
                            totalWalkingTimeMinutes + inPathWalkingTimeMinutes;

                        // Loại bỏ lộ trình có tổng đi bộ vượt ngưỡng cho phép
                        if (allWalkingDistanceKm > MAX_TOTAL_WALKING_DISTANCE_KM) {
                            continue;
                        }

                        const totalDistance =
                            path.totalDistance + allWalkingDistanceKm;
                        const totalTime =
                            path.totalTime + allWalkingTimeMinutes;

                        const optimizationScore =
                            this.calculateOptimizationScore(
                                config.weights,
                                totalTime,
                                path.totalCost,
                                totalDistance,
                            );

                        // Merge: walking đầu → walking chuyển tuyến → walking cuối
                        const allWalkingLegs: WalkingLegDto[] = [
                            ...(walkingFromLeg ? [walkingFromLeg] : []),
                            ...transferWalkingDtos,
                            ...(walkingToLeg ? [walkingToLeg] : []),
                        ];

                        allPaths.push({
                            stations: path.stations.map((s) =>
                                this.mapStationInfo(s),
                            ),
                            routes: path.routes,
                            totalDistance,
                            totalTime,
                            totalCost: path.totalCost,
                            transfers: this.countTransfersFromSegments(
                                path.segments,
                            ),
                            segments: path.segments,
                            optimizationScore,
                            optimizationType: config.type,
                            ...(allWalkingLegs.length > 0 && {
                                walkingLegs: allWalkingLegs,
                            }),
                            ...(allWalkingDistanceKm > 0 && {
                                totalWalkingDistanceKm: allWalkingDistanceKm,
                                totalWalkingTimeMinutes: allWalkingTimeMinutes,
                                transitDistanceKm: path.totalDistance,
                                transitTimeMinutes: path.totalTime,
                            }),
                        });
                    }
                }
            }
        }

        const uniquePaths = this.removeDuplicatePaths(allPaths);
        uniquePaths.sort((a, b) => a.optimizationScore - b.optimizationScore);
        const finalPaths = uniquePaths.slice(0, numPaths);

        const executionTime = Date.now() - startTime;

        this.logger.debug(
            `MOA* unified: ${finalPaths.length} paths in ${executionTime}ms, ` +
                `${totalNodesExplored} nodes, ` +
                `${fromCandidates.length}×${toCandidates.length} station pairs`,
        );

        const result: RoutingResponseData = {
            paths: finalPaths,
            metrics: {
                algorithm: 'MOA*-Unified',
                executionTimeMs: executionTime,
                nodesExplored: totalNodesExplored,
                explorationRatePercent:
                    graph.nodes.size > 0
                        ? (totalNodesExplored / graph.nodes.size) * 100
                        : 0,
                heuristicUsed: true,
                hasFallback: false,
                cacheHit: false,
            },
            congestionApplied: congestionAware && congestionFactor !== 1.0,
            timeOfDay: timeOfDay ?? new Date().getHours(),
        };

        // Lưu kết quả vào Redis (fire-and-forget, không block response)
        this.redisService
            .set(
                cacheKey,
                JSON.stringify(result),
                ROUTING_RESULT_CACHE_TTL_SECONDS,
            )
            .catch((err) =>
                this.logger.warn(`Failed to cache routing result: ${err}`),
            );

        return result;
    }

    mapGet(routingData: RoutingResponseData): RoutingResponseDto {
        return plainToInstance(RoutingResponseDto, routingData);
    }

    /**
     * Normalize weights để tổng = 1
     */
    private normalizeWeights(
        weights: MultiObjectiveWeights,
    ): MultiObjectiveWeights {
        const totalWeight =
            weights.timeWeight + weights.costWeight + weights.distanceWeight;

        if (totalWeight === 0) {
            return { timeWeight: 0, costWeight: 0, distanceWeight: 0 };
        }

        return {
            timeWeight: weights.timeWeight / totalWeight,
            costWeight: weights.costWeight / totalWeight,
            distanceWeight: weights.distanceWeight / totalWeight,
        };
    }

    /**
     * Lấy danh sách weight configs mặc định
     */
    private getDefaultWeightConfigs(): Array<{
        weights: MultiObjectiveWeights;
        type: ParetoOptimalPathDto['optimizationType'];
    }> {
        return [
            {
                weights: WEIGHT_CONFIG_FASTEST,
                type: 'fastest',
            },
            {
                weights: WEIGHT_CONFIG_CHEAPEST,
                type: 'cheapest',
            },
            {
                weights: WEIGHT_CONFIG_SHORTEST,
                type: 'shortest',
            },
            {
                weights: WEIGHT_CONFIG_BALANCED,
                type: 'balanced',
            },
        ];
    }

    /**
     * So sánh 2 weight configs
     */
    private areWeightsEqual(
        w1: MultiObjectiveWeights,
        w2: MultiObjectiveWeights,
    ): boolean {
        return (
            w1.timeWeight === w2.timeWeight &&
            w1.costWeight === w2.costWeight &&
            w1.distanceWeight === w2.distanceWeight
        );
    }

    /**
     * Tạo custom weight config nếu khác với predefined
     */
    private createCustomWeightConfig(weights: MultiObjectiveWeights): {
        weights: MultiObjectiveWeights;
        type: ParetoOptimalPathDto['optimizationType'];
    } | null {
        const defaultConfigs = this.getDefaultWeightConfigs();

        const isDefaultConfig = defaultConfigs.some((config) =>
            this.areWeightsEqual(config.weights, weights),
        );

        if (isDefaultConfig) {
            return null;
        }

        return {
            weights,
            type: 'custom',
        };
    }

    /**
     * Tạo danh sách weight configs để sử dụng.
     */
    private getWeightConfigsToUse(
        customWeights?: MultiObjectiveWeights,
    ): Array<{
        weights: MultiObjectiveWeights;
        type: ParetoOptimalPathDto['optimizationType'];
    }> {
        const configs = this.getDefaultWeightConfigs();

        if (customWeights) {
            const normalizedCustom = this.normalizeWeights(customWeights);
            const customConfig =
                this.createCustomWeightConfig(normalizedCustom);
            if (customConfig) {
                configs.push(customConfig);
            }
        }

        return configs;
    }

    /**
     * Map station info để loại bỏ coordinates null/undefined
     */
    private mapStationInfo(station: StationInfo): {
        stationCode: string;
        stationName: string;
        coordinates?: { latitude: number; longitude: number };
    } {
        return {
            stationCode: station.stationCode,
            stationName: station.stationName,
            coordinates:
                station.coordinates?.latitude != null &&
                station.coordinates?.longitude != null
                    ? {
                          latitude: station.coordinates.latitude,
                          longitude: station.coordinates.longitude,
                      }
                    : undefined,
        };
    }

    /**
     * Tính optimization score
     * totalCost tính bằng VND (số lần lên xe × FARE_PER_BOARDING).
     * Normalize về "số lần lên xe" để cùng đơn vị với A* edge cost.
     */
    private calculateOptimizationScore(
        weights: MultiObjectiveWeights,
        totalTime: number,
        totalCost: number,
        totalDistance: number,
    ): number {
        const boardingCount = totalCost / FARE_PER_BOARDING;
        return (
            weights.timeWeight * totalTime +
            weights.costWeight * boardingCount +
            weights.distanceWeight * totalDistance
        );
    }
}
