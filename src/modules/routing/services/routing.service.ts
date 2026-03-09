import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GraphBuilderService } from './graph-builder.service';
import { PriorityQueue } from './priority-queue';
import { Graph, GraphNode } from '@modules/routing/interfaces/graph.interface';
import { RoutePath } from '@modules/routing/interfaces/routing.interface';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';
import {
    RoutingResponseDto,
    ParetoOptimalPathDto,
} from '@modules/routing/dtos/response/routing.response.dto';
import { RoutingMetricsDto } from '@modules/routing/dtos/response/routing-metrics.dto';
import { RoutingResponseData } from '@modules/routing/interfaces/routing-response.interface';
import {
    GRAPH_CACHE_TTL,
    AVERAGE_BUS_SPEED,
    COST_PER_KM,
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
} from '@modules/routing/constants/routing.constants';
import { CongestionFactors } from '@modules/routing/interfaces/congestion-factor.interface';
import { MultiObjectiveWeights } from '@modules/routing/interfaces/multi-objective-weight.interface';
import { StationInfo } from '@modules/routing/interfaces/routing.interface';

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

    constructor(private readonly graphBuilder: GraphBuilderService) {}

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
     * Tái tạo đường đi từ cameFrom/previous map
     */
    private reconstructPath(
        graph: Graph,
        cameFrom: Map<string, { node: string; routeCode?: string }>,
        currentCode: string,
        startCode: string,
        criteria: RoutingCriteria,
        maxTransfers?: number,
    ): RoutePath | null {
        const path: string[] = [];
        const routeCodes: string[] = [];
        const segments: RoutePath['segments'] = [];

        let current = currentCode;

        // Xây dựng path ngược từ goal về start
        while (current) {
            path.unshift(current);
            const prev = cameFrom.get(current);
            if (prev) {
                if (prev.routeCode && !routeCodes.includes(prev.routeCode)) {
                    routeCodes.unshift(prev.routeCode);
                }

                // Tạo segment
                if (prev.node) {
                    const fromNode = graph.nodes.get(prev.node)!;
                    const toNode = graph.nodes.get(current)!;
                    const edge = fromNode.neighbors.get(current);

                    if (edge) {
                        segments.unshift({
                            from: prev.node,
                            to: current,
                            routeCode: edge.routeCode,
                            routeName: edge.route.routeName,
                            distance: edge.distance,
                            time: this.graphBuilder.calculateWeight(
                                edge,
                                RoutingCriteria.TIME,
                            ),
                            cost: this.graphBuilder.calculateWeight(
                                edge,
                                RoutingCriteria.COST,
                            ),
                        });
                    }
                }

                current = prev.node;
            } else {
                break;
            }
        }

        // Tính tổng distance, time, cost
        let totalDistance = 0;
        let totalTime = 0;
        let totalCost = 0;

        for (const segment of segments) {
            totalDistance += segment.distance;
            totalTime += segment.time;
            totalCost += segment.cost;
        }

        // Lấy thông tin stations và routes
        const stations = path.map((code) => {
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

        const routes = routeCodes.map((code) => {
            // Tìm route từ segments
            const segment = segments.find((s) => s.routeCode === code);
            return {
                routeCode: code,
                routeName: segment?.routeName || code,
            };
        });

        // Đếm số lần chuyển tuyến (số lần đổi routeCode)
        const transfers = this.countTransfersFromSegments(segments);
        if (maxTransfers !== undefined && transfers > maxTransfers) {
            return null;
        }

        return {
            stations,
            routes: Array.from(
                new Map(routes.map((r) => [r.routeCode, r])).values(),
            ),
            totalDistance,
            totalTime,
            totalCost,
            segments,
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

        // Normalize weights và lấy weight configs
        const normalizedWeights = this.normalizeWeights(weights);
        const configsToUse = this.getWeightConfigsToUse(
            numPaths,
            normalizedWeights,
        );

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

                const mappedStations = path.stations.map((station) =>
                    this.mapStationInfo(station),
                );

                paths.push({
                    stations: mappedStations,
                    routes: path.routes,
                    totalDistance: path.totalDistance,
                    totalTime: path.totalTime,
                    totalCost: path.totalCost,
                    transfers: this.countTransfersFromSegments(path.segments),
                    segments: path.segments,
                    optimizationScore,
                    optimizationType: config.type,
                });
            }
        }

        // Loại bỏ duplicates (paths giống nhau)
        const uniquePaths = this.removeDuplicatePaths(paths);

        // Sort theo optimization score
        uniquePaths.sort((a, b) => a.optimizationScore - b.optimizationScore);

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
            `MOA* found ${uniquePaths.length} Pareto-optimal paths in ${executionTime}ms, explored ${nodesExplored} nodes`,
        );

        return {
            paths: uniquePaths,
            metrics,
            congestionApplied: congestionAware && congestionFactor !== 1.0,
            timeOfDay: timeOfDay ?? new Date().getHours(),
        };
    }

    /**
     *  Helper method để tìm path với multi-objective weights cụ thể
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

        // Tính heuristic đa tiêu chí
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

            const time =
                (distance / AVERAGE_BUS_SPEED) *
                MINUTES_PER_HOUR *
                congestionFactor;
            const cost = distance * COST_PER_KM;

            return (
                weights.timeWeight * time +
                weights.costWeight * cost +
                weights.distanceWeight * distance
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
            { node: string; routeCode?: string }
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
                    // Apply congestion factor to time
                    const adjustedPath: RoutePath & { nodesExplored?: number } =
                        {
                            ...path,
                            totalTime: path.totalTime * congestionFactor,
                            nodesExplored,
                        };

                    // Update segments with congestion
                    adjustedPath.segments = path.segments.map((seg) => ({
                        ...seg,
                        time: seg.time * congestionFactor,
                    }));

                    return adjustedPath;
                }
            }

            closedSet.add(currentCode);
            nodesExplored++;

            for (const [
                neighborCode,
                edge,
            ] of currentNode.neighbors.entries()) {
                if (closedSet.has(neighborCode)) continue;

                const neighbor = graph.nodes.get(neighborCode)!;

                // Tính edge weight đa tiêu chí
                const edgeDistance = edge.distance;
                const edgeTime =
                    (edgeDistance / AVERAGE_BUS_SPEED) *
                    MINUTES_PER_HOUR *
                    congestionFactor;
                const edgeCost = edgeDistance * COST_PER_KM;

                const edgeWeight =
                    weights.timeWeight * edgeTime +
                    weights.costWeight * edgeCost +
                    weights.distanceWeight * edgeDistance;

                const tentativeGScore =
                    (gScore.get(currentCode) ?? Infinity) + edgeWeight;

                const neighborGScore = gScore.get(neighborCode) ?? Infinity;

                if (tentativeGScore < neighborGScore) {
                    cameFrom.set(neighborCode, {
                        node: currentCode,
                        routeCode: edge.routeCode,
                    });
                    gScore.set(neighborCode, tentativeGScore);

                    const h = multiObjectiveHeuristic(neighbor, goalNode);
                    const f = tentativeGScore + h;
                    fScore.set(neighborCode, f);

                    if (!openSetMap.has(neighborCode)) {
                        openSet.insert({
                            stationCode: neighborCode,
                            fScore: f,
                        });
                        openSetMap.set(neighborCode, true);
                    } else {
                        openSet.insert({
                            stationCode: neighborCode,
                            fScore: f,
                        });
                    }
                }
            }
        }

        return null;
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
     * Tìm trạm gần nhất từ tọa độ
     */
    async findNearestStation(
        latitude: number,
        longitude: number,
    ): Promise<string | null> {
        const graph = await this.getGraph();
        let nearestStationCode: string | null = null;
        let minDistance = Infinity;

        for (const [stationCode, node] of graph.nodes.entries()) {
            if (!node.station.latitude || !node.station.longitude) {
                continue;
            }

            const distance = this.graphBuilder.calculateDistance(
                latitude,
                longitude,
                node.station.latitude,
                node.station.longitude,
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestStationCode = stationCode;
            }
        }

        return nearestStationCode;
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
     * Tạo danh sách weight configs để sử dụng
     */
    private getWeightConfigsToUse(
        numPaths: number,
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

        return configs.slice(0, numPaths);
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
     */
    private calculateOptimizationScore(
        weights: MultiObjectiveWeights,
        totalTime: number,
        totalCost: number,
        totalDistance: number,
    ): number {
        return (
            weights.timeWeight * totalTime +
            weights.costWeight * totalCost +
            weights.distanceWeight * totalDistance
        );
    }
}
