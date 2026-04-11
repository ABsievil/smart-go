import { Injectable, Logger } from '@nestjs/common';
import { RouteService } from '@modules/routes/services/route.service';
import { StationService } from '@modules/stations/services/station.service';
import {
    Graph,
    GraphNode,
    GraphEdge,
} from '@modules/routing/interfaces/graph.interface';
import {
    EARTH_RADIUS_KM,
    DEGREES_TO_RADIANS,
    AVERAGE_BUS_SPEED,
    FARE_PER_BOARDING,
    DEFAULT_DISTANCE,
    MINUTES_PER_HOUR,
    MAX_ROUTES_PER_PAGE,
    MAX_STATIONS_PER_PAGE,
    GRAPH_DATA_REDIS_TTL_SECONDS,
    REDIS_KEY_GRAPH_ROUTES,
    REDIS_KEY_GRAPH_STATIONS,
} from '@modules/routing/constants/routing.constants';
import {
    RouteLite,
    StationLite,
} from '@modules/routing/interfaces/graph-data.interface';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';
import { RedisService } from '@common/redis/redis.service';

/**
 * Service xây dựng đồ thị từ routes và stations.
 *
 * Tối ưu bộ nhớ:
 *  - GraphNode/GraphEdge chỉ lưu các field cần thiết (GraphStationLite, GraphRouteLite)
 *    thay vì toàn bộ Mongoose entity — giảm ~70-80% memory cho mỗi node/edge.
 *
 * Tối ưu hiệu năng:
 *  - Raw DB data (routes + stations) được cache trong Redis (TTL 10 phút).
 *  - Khi buildGraph: kiểm tra Redis trước, chỉ query MongoDB nếu cache miss.
 *  - Khi service restart, graph rebuild từ Redis (~ms) thay vì MongoDB (~s).
 */
@Injectable()
export class GraphBuilderService {
    private readonly logger = new Logger(GraphBuilderService.name);

    constructor(
        private readonly routeService: RouteService,
        private readonly stationService: StationService,
        private readonly redisService: RedisService,
    ) {}

    /**
     * Tính khoảng cách Haversine giữa hai điểm (km)
     */
    calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ): number {
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    private toRad(degrees: number): number {
        return degrees * DEGREES_TO_RADIANS;
    }

    /**
     * @description Lấy raw data (routes + stations) — Redis cache trước, fallback MongoDB.
     */
    private async fetchRawData(): Promise<{
        routes: RouteLite[];
        stations: StationLite[];
    }> {
        const [cachedRoutes, cachedStations] = await Promise.all([
            this.redisService.get(REDIS_KEY_GRAPH_ROUTES),
            this.redisService.get(REDIS_KEY_GRAPH_STATIONS),
        ]);

        if (cachedRoutes && cachedStations) {
            this.logger.debug('Graph raw data loaded from Redis cache');
            return {
                routes: JSON.parse(cachedRoutes) as RouteLite[],
                stations: JSON.parse(cachedStations) as StationLite[],
            };
        }

        this.logger.debug('Graph raw data cache miss — fetching from MongoDB');

        const [{ data: fullRoutes }, { data: fullStations }] =
            await Promise.all([
                this.routeService.findAll({}, 1, MAX_ROUTES_PER_PAGE),
                this.stationService.findAll({}, 1, MAX_STATIONS_PER_PAGE),
            ]);

        const routes: RouteLite[] = fullRoutes
            .filter((r) => r.stationIds?.length >= 2)
            .map((r) => ({
                routeCode: r.routeCode,
                routeName: r.routeName,
                stationIds: r.stationIds,
            }));

        const stations: StationLite[] = fullStations.map((s) => ({
            _id: s._id,
            stationCode: s.stationCode,
            stationName: s.stationName,
            latitude: s.latitude,
            longitude: s.longitude,
        }));

        // Cache song song trong Redis
        await Promise.all([
            this.redisService.set(
                REDIS_KEY_GRAPH_ROUTES,
                JSON.stringify(routes),
                GRAPH_DATA_REDIS_TTL_SECONDS,
            ),
            this.redisService.set(
                REDIS_KEY_GRAPH_STATIONS,
                JSON.stringify(stations),
                GRAPH_DATA_REDIS_TTL_SECONDS,
            ),
        ]);

        this.logger.debug(
            `Graph raw data cached: ${routes.length} routes, ${stations.length} stations`,
        );

        return { routes, stations };
    }

    /**
     * @description Xây dựng đồ thị từ tất cả routes và stations.
     * Sử dụng Redis cache cho raw data để tránh query MongoDB mỗi lần.
     */
    async buildGraph(): Promise<Graph> {
        const graph: Graph = {
            nodes: new Map<string, GraphNode>(),
        };

        const { routes, stations } = await this.fetchRawData();

        const stationMap = new Map<string, StationLite>();
        for (const station of stations) {
            stationMap.set(station._id, station);
        }

        for (const route of routes) {
            this.processStationIds(route, route.stationIds, graph, stationMap);
        }

        return graph;
    }

    /**
     * @description Xử lý stationIds để tạo edges giữa các trạm liên tiếp.
     * Lưu nhiều edges (theo tuyến) cho cùng 1 cặp trạm.
     */
    private processStationIds(
        route: RouteLite,
        stationIds: string[],
        graph: Graph,
        stationMap: Map<string, StationLite>,
    ): void {
        if (stationIds.length < 2) return;

        for (let i = 0; i < stationIds.length - 1; i++) {
            const fromStation = stationMap.get(stationIds[i]);
            const toStation = stationMap.get(stationIds[i + 1]);

            if (!fromStation || !toStation) continue;

            const fromCode = fromStation.stationCode;
            const toCode = toStation.stationCode;

            let distance = DEFAULT_DISTANCE;
            if (
                fromStation.latitude &&
                fromStation.longitude &&
                toStation.latitude &&
                toStation.longitude
            ) {
                distance = this.calculateDistance(
                    fromStation.latitude,
                    fromStation.longitude,
                    toStation.latitude,
                    toStation.longitude,
                );
            }

            // Tạo node nếu chưa có — chỉ lưu fields cần thiết (GraphStationLite)
            if (!graph.nodes.has(fromCode)) {
                graph.nodes.set(fromCode, {
                    stationCode: fromCode,
                    station: {
                        stationName: fromStation.stationName,
                        latitude: fromStation.latitude,
                        longitude: fromStation.longitude,
                    },
                    neighbors: new Map(),
                });
            }

            if (!graph.nodes.has(toCode)) {
                graph.nodes.set(toCode, {
                    stationCode: toCode,
                    station: {
                        stationName: toStation.stationName,
                        latitude: toStation.latitude,
                        longitude: toStation.longitude,
                    },
                    neighbors: new Map(),
                });
            }

            // Tạo edge — chỉ lưu routeName từ route (GraphRouteLite)
            const edge: GraphEdge = {
                from: fromCode,
                to: toCode,
                routeCode: route.routeCode,
                route: { routeName: route.routeName },
                distance,
                weight: distance,
            };

            // Giữ TẤT CẢ edges theo tuyến — A* chọn đúng tuyến theo ngữ cảnh
            const fromNode = graph.nodes.get(fromCode)!;
            const existingEdges = fromNode.neighbors.get(toCode);
            if (!existingEdges) {
                fromNode.neighbors.set(toCode, [edge]);
            } else if (
                !existingEdges.some((e) => e.routeCode === edge.routeCode)
            ) {
                existingEdges.push(edge);
            }
        }
    }

    /**
     * @description Tính weight dựa trên tiêu chí (distance, time, cost)
     */
    calculateWeight(
        edge: GraphEdge,
        criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
    ): number {
        switch (criteria) {
            case RoutingCriteria.DISTANCE:
                return edge.distance;

            case RoutingCriteria.TIME:
                return (edge.distance / AVERAGE_BUS_SPEED) * MINUTES_PER_HOUR;

            case RoutingCriteria.COST:
                return FARE_PER_BOARDING;

            default:
                return edge.distance;
        }
    }
}
