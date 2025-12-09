import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GraphBuilderService } from './graph-builder.service';
import { PriorityQueue } from './priority-queue';
import { Graph, GraphNode } from '@modules/routing/interfaces/graph.interface';
import { RoutePath } from '@modules/routing/interfaces/routing.interface';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';
import { RoutingResponseDto } from '@modules/routing/dtos/response/routing-response.dto';
import {
    MultiObjectiveRoutingResponseDto,
    ParetoOptimalPathDto,
} from '@modules/routing/dtos/response/multi-objective-routing-response.dto';
import { RoutingMetricsDto } from '@modules/routing/dtos/response/routing-metrics.dto';
import {
    GRAPH_CACHE_TTL,
    AVERAGE_BUS_SPEED,
    COST_PER_KM,
    MINUTES_PER_HOUR,
} from '@modules/routing/constants/routing.constants';

/**
 * Interface cho trọng số đa tiêu chí
 */
interface MultiObjectiveWeights {
    timeWeight: number;
    costWeight: number;
    distanceWeight: number;
}

/**
 * Interface cho congestion factors theo giờ
 */
interface CongestionFactors {
    rushHourMorning: number[]; // 6-9h
    rushHourEvening: number[]; // 16-19h
    normal: number;
}

/**
 * Service chứa các thuật toán định tuyến (A*, Dijkstra và Multi-Objective A*)
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
        rushHourMorning: [6, 7, 8, 9], // 6-9h sáng
        rushHourEvening: [16, 17, 18, 19], // 16-19h chiều
        normal: 1.0, // Bình thường
    };

    constructor(private readonly graphBuilder: GraphBuilderService) {}

    mapGet(path: RoutePath | null, message?: string): RoutingResponseDto {
        return plainToInstance(
            RoutingResponseDto,
            { path, message },
            { excludeExtraneousValues: true },
        );
    }

    mapList(paths: RoutePath[], message?: string): RoutingResponseDto[] {
        return paths.map((path) => this.mapGet(path, message));
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
            return 1.2; // +20% thời gian
        }

        if (this.congestionFactors.rushHourEvening.includes(timeOfDay)) {
            return 1.2; // +20% thời gian
        }

        return this.congestionFactors.normal;
    }

    /**
     * Tính heuristic - Admissible (không bao giờ overestimate)
     * Hỗ trợ 3 loại: Euclidean distance, time-based, cost-based
     */
    private heuristic(
        from: GraphNode,
        to: GraphNode,
        criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
    ): number {
        const fromCoords = from.station.coordinates;
        const toCoords = to.station.coordinates;

        if (
            !fromCoords?.latitude ||
            !fromCoords?.longitude ||
            !toCoords?.latitude ||
            !toCoords?.longitude
        ) {
            // Nếu không có coordinates, trả về 0 (fallback về Dijkstra)
            return 0;
        }

        // Tính khoảng cách Euclidean (Haversine)
        const distance = this.graphBuilder.calculateDistance(
            fromCoords.latitude,
            fromCoords.longitude,
            toCoords.latitude,
            toCoords.longitude,
        );

        switch (criteria) {
            case RoutingCriteria.DISTANCE:
                // Heuristic dựa trên khoảng cách: h(n) = Euclidean distance
                // Luôn admissible vì đường thẳng là đường ngắn nhất
                return distance;

            case RoutingCriteria.TIME:
                // Heuristic dựa trên thời gian: h(n) = distance / tốc_độ_tối_đa
                // Có thể tùy chỉnh với dữ liệu tắc nghẽn (ví dụ: +20% trong giờ cao điểm)
                return (distance / AVERAGE_BUS_SPEED) * MINUTES_PER_HOUR;

            case RoutingCriteria.COST:
                // Heuristic dựa trên chi phí: h(n) = distance * chi_phí_tối_thiểu_mỗi_km
                return distance * COST_PER_KM;

            default:
                return distance;
        }
    }

    /**
     * Thuật toán A* để tìm đường đi tối ưu
     * Sử dụng Priority Queue (min-heap) để tối ưu hiệu suất
     * Độ phức tạp: O((V + E) log V) với binary heap
     */
    async findPathAStar(
        fromStationCode: string,
        toStationCode: string,
        criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
        maxTransfers?: number,
    ): Promise<RoutePath | null> {
        const startTime = Date.now();
        const graph = await this.getGraph();

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

        // Nếu start và goal giống nhau
        if (fromStationCode === toStationCode) {
            return {
                stations: [
                    {
                        stationCode: startNode.stationCode,
                        stationName: startNode.station.stationName,
                        coordinates: startNode.station.coordinates,
                    },
                ],
                routes: [],
                totalDistance: 0,
                totalTime: 0,
                totalCost: 0,
                segments: [],
            };
        }

        // Kiểm tra heuristic có khả dụng không
        const initialHeuristic = this.heuristic(startNode, goalNode, criteria);
        const useHeuristic = initialHeuristic > 0;

        // Open set: Priority Queue (min-heap) sắp xếp theo fScore
        const openSet = new PriorityQueue<{
            stationCode: string;
            fScore: number;
        }>((a, b) => a.fScore - b.fScore);

        // Track nodes trong open set để kiểm tra nhanh
        const openSetMap = new Map<string, boolean>();

        // Closed set: các node đã được xử lý
        const closedSet = new Set<string>();

        // gScore: chi phí thực tế từ start đến node
        const gScore = new Map<string, number>();
        gScore.set(fromStationCode, 0);

        // fScore: ước tính tổng chi phí (g + h)
        const fScore = new Map<string, number>();
        fScore.set(fromStationCode, initialHeuristic);

        // cameFrom: để tái tạo đường đi
        const cameFrom = new Map<
            string,
            { node: string; routeCode?: string }
        >();

        // Thêm start node vào open set
        openSet.insert({
            stationCode: fromStationCode,
            fScore: initialHeuristic,
        });
        openSetMap.set(fromStationCode, true);

        let nodesExplored = 0;

        while (!openSet.isEmpty()) {
            // Lấy node có fScore thấp nhất từ priority queue
            // Lưu ý: có thể có duplicate entries, nên cần kiểm tra closedSet
            let current = openSet.extractMin();
            if (!current) {
                break;
            }

            // Bỏ qua nếu node đã được xử lý (do duplicate entries)
            while (current && closedSet.has(current.stationCode)) {
                current = openSet.extractMin();
                if (!current) {
                    break;
                }
            }

            if (!current) {
                break;
            }

            const currentCode = current.stationCode;
            const currentNode = graph.nodes.get(currentCode)!;

            // Kiểm tra fScore có khớp với fScore hiện tại không
            // Nếu không khớp, node này đã được cập nhật và có entry mới hơn trong heap
            const currentFScore = fScore.get(currentCode) ?? Infinity;
            if (current.fScore !== currentFScore) {
                // fScore đã thay đổi, bỏ qua entry cũ này và tiếp tục
                continue;
            }

            // Xóa khỏi open set map
            openSetMap.delete(currentCode);

            // Nếu đã đến đích
            if (currentCode === toStationCode) {
                const executionTime = Date.now() - startTime;
                this.logger.debug(
                    `A* found path in ${executionTime}ms, explored ${nodesExplored} nodes`,
                );
                return this.reconstructPath(
                    graph,
                    cameFrom,
                    currentCode,
                    fromStationCode,
                    criteria,
                    maxTransfers,
                );
            }

            // Thêm vào closed set
            closedSet.add(currentCode);
            nodesExplored++;

            // Xem xét các neighbors
            for (const [
                neighborCode,
                edge,
            ] of currentNode.neighbors.entries()) {
                if (closedSet.has(neighborCode)) {
                    continue;
                }

                const neighbor = graph.nodes.get(neighborCode)!;
                const edgeWeight = this.graphBuilder.calculateWeight(
                    edge,
                    criteria,
                );
                const tentativeGScore =
                    (gScore.get(currentCode) ?? Infinity) + edgeWeight;

                const neighborGScore = gScore.get(neighborCode) ?? Infinity;

                if (tentativeGScore < neighborGScore) {
                    // Đường đi tốt hơn được tìm thấy
                    cameFrom.set(neighborCode, {
                        node: currentCode,
                        routeCode: edge.routeCode,
                    });
                    gScore.set(neighborCode, tentativeGScore);

                    // Tính heuristic
                    const h = useHeuristic
                        ? this.heuristic(neighbor, goalNode, criteria)
                        : 0;
                    const f = tentativeGScore + h;
                    fScore.set(neighborCode, f);

                    // Thêm hoặc cập nhật trong open set
                    if (!openSetMap.has(neighborCode)) {
                        // Node chưa có trong open set, thêm mới
                        openSet.insert({
                            stationCode: neighborCode,
                            fScore: f,
                        });
                        openSetMap.set(neighborCode, true);
                    } else {
                        // Node đã có trong open set, cập nhật fScore
                        // Insert lại với fScore mới (sẽ có duplicate nhưng sẽ được xử lý khi extractMin)
                        // Cách này đơn giản và vẫn đảm bảo tính đúng đắn
                        openSet.insert({
                            stationCode: neighborCode,
                            fScore: f,
                        });
                    }
                }
            }
        }

        // Không tìm thấy đường đi
        const executionTime = Date.now() - startTime;
        this.logger.debug(
            `A* no path found in ${executionTime}ms, explored ${nodesExplored} nodes`,
        );
        return null;
    }

    /**
     * Thuật toán Dijkstra (A* với h(n) = 0)
     * Sử dụng như fallback khi A* không tìm thấy hoặc heuristic không khả dụng
     * Đảm bảo tính tối ưu 100% nhưng chậm hơn A*
     */
    async findPathDijkstra(
        fromStationCode: string,
        toStationCode: string,
        criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
        maxTransfers?: number,
    ): Promise<RoutePath | null> {
        const startTime = Date.now();
        const graph = await this.getGraph();

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

        // Nếu start và goal giống nhau
        if (fromStationCode === toStationCode) {
            return {
                stations: [
                    {
                        stationCode: startNode.stationCode,
                        stationName: startNode.station.stationName,
                        coordinates: startNode.station.coordinates,
                    },
                ],
                routes: [],
                totalDistance: 0,
                totalTime: 0,
                totalCost: 0,
                segments: [],
            };
        }

        // Distance map: khoảng cách ngắn nhất từ start đến mỗi node
        const distances = new Map<string, number>();
        distances.set(fromStationCode, 0);

        // Previous: để tái tạo đường đi
        const previous = new Map<
            string,
            { node: string; routeCode?: string }
        >();

        // Sử dụng Priority Queue để tối ưu hiệu suất
        const unvisited = new PriorityQueue<{
            stationCode: string;
            distance: number;
        }>((a, b) => a.distance - b.distance);

        const visited = new Set<string>();
        const unvisitedMap = new Map<string, boolean>();

        // Thêm start node
        unvisited.insert({
            stationCode: fromStationCode,
            distance: 0,
        });
        unvisitedMap.set(fromStationCode, true);

        let nodesExplored = 0;

        while (!unvisited.isEmpty()) {
            // Lấy node có distance nhỏ nhất
            let current = unvisited.extractMin();
            if (!current) {
                break;
            }

            // Bỏ qua nếu node đã được xử lý (do duplicate entries)
            while (current && visited.has(current.stationCode)) {
                current = unvisited.extractMin();
                if (!current) {
                    break;
                }
            }

            if (!current) {
                break;
            }

            const currentCode = current.stationCode;
            const currentDistance = distances.get(currentCode) ?? Infinity;

            if (currentDistance === Infinity) {
                break; // Không còn đường đi
            }

            // Kiểm tra distance có khớp không (tránh duplicate entries cũ)
            if (current.distance !== currentDistance) {
                // Distance đã thay đổi, bỏ qua entry cũ này và tiếp tục
                continue;
            }

            if (currentCode === toStationCode) {
                // Đã đến đích
                const executionTime = Date.now() - startTime;
                this.logger.debug(
                    `Dijkstra found path in ${executionTime}ms, explored ${nodesExplored} nodes`,
                );
                return this.reconstructPath(
                    graph,
                    previous,
                    currentCode,
                    fromStationCode,
                    criteria,
                    maxTransfers,
                );
            }

            unvisitedMap.delete(currentCode);
            visited.add(currentCode);
            nodesExplored++;

            const currentNode = graph.nodes.get(currentCode)!;

            // Cập nhật distances cho các neighbors
            for (const [
                neighborCode,
                edge,
            ] of currentNode.neighbors.entries()) {
                if (visited.has(neighborCode)) {
                    continue;
                }

                const edgeWeight = this.graphBuilder.calculateWeight(
                    edge,
                    criteria,
                );
                const alt = currentDistance + edgeWeight;
                const neighborDistance =
                    distances.get(neighborCode) ?? Infinity;

                if (alt < neighborDistance) {
                    distances.set(neighborCode, alt);
                    previous.set(neighborCode, {
                        node: currentCode,
                        routeCode: edge.routeCode,
                    });

                    // Thêm hoặc cập nhật trong unvisited queue
                    if (!unvisitedMap.has(neighborCode)) {
                        unvisited.insert({
                            stationCode: neighborCode,
                            distance: alt,
                        });
                        unvisitedMap.set(neighborCode, true);
                    } else {
                        // Cập nhật priority bằng cách insert lại
                        // (sẽ có duplicate nhưng sẽ được xử lý khi extractMin)
                        unvisited.insert({
                            stationCode: neighborCode,
                            distance: alt,
                        });
                    }
                }
            }
        }

        // Không tìm thấy đường đi
        const executionTime = Date.now() - startTime;
        this.logger.debug(
            `Dijkstra no path found in ${executionTime}ms, explored ${nodesExplored} nodes`,
        );
        return null;
    }

    /**
     * Tìm đường đi với fallback mechanism
     * Thử A* trước, nếu không tìm thấy hoặc heuristic không tốt, chuyển sang Dijkstra
     */
    async findPathWithFallback(
        fromStationCode: string,
        toStationCode: string,
        criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
        preferAStar: boolean = true,
        maxTransfers?: number,
    ): Promise<RoutePath | null> {
        if (preferAStar) {
            // Thử A* trước
            const aStarResult = await this.findPathAStar(
                fromStationCode,
                toStationCode,
                criteria,
                maxTransfers,
            );

            if (aStarResult) {
                return aStarResult;
            }

            // Nếu A* không tìm thấy, fallback sang Dijkstra
            this.logger.debug(
                `A* failed, falling back to Dijkstra for ${fromStationCode} -> ${toStationCode}`,
            );
            return this.findPathDijkstra(
                fromStationCode,
                toStationCode,
                criteria,
                maxTransfers,
            );
        } else {
            // Sử dụng Dijkstra trực tiếp
            return this.findPathDijkstra(
                fromStationCode,
                toStationCode,
                criteria,
                maxTransfers,
            );
        }
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
                stationName: node.station.stationName,
                coordinates: node.station.coordinates,
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
    async findPathsMultiObjective(
        fromStationCode: string,
        toStationCode: string,
        weights: MultiObjectiveWeights,
        numPaths: number = 3,
        maxTransfers?: number,
        timeOfDay?: number,
        congestionAware: boolean = true,
    ): Promise<MultiObjectiveRoutingResponseDto> {
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
            : 1.0;

        // Normalize weights để tổng = 1
        const totalWeight =
            weights.timeWeight + weights.costWeight + weights.distanceWeight;
        const normalizedWeights: MultiObjectiveWeights = {
            timeWeight: totalWeight > 0 ? weights.timeWeight / totalWeight : 0,
            costWeight: totalWeight > 0 ? weights.costWeight / totalWeight : 0,
            distanceWeight:
                totalWeight > 0 ? weights.distanceWeight / totalWeight : 0,
        };

        const paths: ParetoOptimalPathDto[] = [];
        let nodesExplored = 0;

        // Tìm lộ trình cho các cấu hình trọng số khác nhau để có Pareto front
        const weightConfigs: Array<{
            weights: MultiObjectiveWeights;
            type: ParetoOptimalPathDto['optimizationType'];
        }> = [
            // Fastest
            {
                weights: { timeWeight: 1.0, costWeight: 0, distanceWeight: 0 },
                type: 'fastest',
            },
            // Cheapest
            {
                weights: { timeWeight: 0, costWeight: 1.0, distanceWeight: 0 },
                type: 'cheapest',
            },
            // Shortest
            {
                weights: { timeWeight: 0, costWeight: 0, distanceWeight: 1.0 },
                type: 'shortest',
            },
            // Balanced
            {
                weights: {
                    timeWeight: 0.5,
                    costWeight: 0.3,
                    distanceWeight: 0.2,
                },
                type: 'balanced',
            },
        ];

        // Thêm cấu hình custom nếu khác với predefined
        if (
            normalizedWeights.timeWeight > 0 ||
            normalizedWeights.costWeight > 0 ||
            normalizedWeights.distanceWeight > 0
        ) {
            weightConfigs.push({
                weights: normalizedWeights,
                type: 'custom',
            });
        }

        // Giới hạn số lượng paths theo numPaths
        const configsToUse = weightConfigs.slice(0, numPaths);

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

                // Tính optimization score
                const optimizationScore =
                    config.weights.timeWeight * path.totalTime +
                    config.weights.costWeight * path.totalCost +
                    config.weights.distanceWeight * path.totalDistance;

                // Map stations để match type ParetoOptimalPathDto
                const mappedStations = path.stations.map((station) => ({
                    stationCode: station.stationCode,
                    stationName: station.stationName,
                    coordinates:
                        station.coordinates?.latitude !== undefined &&
                        station.coordinates?.longitude !== undefined
                            ? {
                                  latitude: station.coordinates.latitude,
                                  longitude: station.coordinates.longitude,
                              }
                            : undefined,
                }));

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

        return plainToInstance(MultiObjectiveRoutingResponseDto, {
            paths: uniquePaths,
            metrics,
            congestionApplied: congestionAware && congestionFactor !== 1.0,
            timeOfDay: timeOfDay ?? new Date().getHours(),
        });
    }

    /**
     * Helper method để tìm path với multi-objective weights cụ thể
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
            const fromCoords = from.station.coordinates;
            const toCoords = to.station.coordinates;

            if (
                !fromCoords?.latitude ||
                !fromCoords?.longitude ||
                !toCoords?.latitude ||
                !toCoords?.longitude
            ) {
                return 0;
            }

            const distance = this.graphBuilder.calculateDistance(
                fromCoords.latitude,
                fromCoords.longitude,
                toCoords.latitude,
                toCoords.longitude,
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
}
