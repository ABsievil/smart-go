import { Injectable } from '@nestjs/common';
import { RouteService } from '@modules/routes/services/route.service';
import { StationService } from '@modules/stations/services/station.service';
import { RouteEntity } from '@modules/routes/repositories/entities/route.entity';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';
import {
    Graph,
    GraphNode,
    GraphEdge,
} from '@modules/routing/interfaces/graph.interface';
import {
    EARTH_RADIUS_KM,
    DEGREES_TO_RADIANS,
    AVERAGE_BUS_SPEED,
    COST_PER_KM,
    DEFAULT_DISTANCE,
    MINUTES_PER_HOUR,
    MAX_ROUTES_PER_PAGE,
    MAX_STATIONS_PER_PAGE,
} from '@modules/routing/constants/routing.constants';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';

/**
 * Service để xây dựng đồ thị từ routes và stations
 */
@Injectable()
export class GraphBuilderService {
    constructor(
        private readonly routeService: RouteService,
        private readonly stationService: StationService,
    ) {}

    /**
     * @description Tính khoảng cách Euclidean giữa hai điểm (Haversine formula)
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
     * @description Xây dựng đồ thị từ tất cả routes và stations
     */
    async buildGraph(): Promise<Graph> {
        const graph: Graph = {
            nodes: new Map<string, GraphNode>(),
        };

        // Lấy tất cả routes và stations
        const { data: routes } = await this.routeService.findAll(
            {},
            1,
            MAX_ROUTES_PER_PAGE,
        );
        const { data: stations } = await this.stationService.findAll(
            {},
            1,
            MAX_STATIONS_PER_PAGE,
        );

        // Tạo map stations để tra cứu nhanh theo _id (vì stationIds lưu _id)
        const stationMap = new Map<string, StationEntity>();
        for (const station of stations) {
            stationMap.set(station._id, station);
        }

        // Xây dựng nodes và edges từ routes (dùng stationIds)
        let routesWithStationIds = 0;
        for (const route of routes) {
            if (route.stationIds && route.stationIds.length >= 2) {
                routesWithStationIds++;
                this.processStationIds(
                    route,
                    route.stationIds,
                    graph,
                    stationMap,
                );
            }
        }

        return graph;
    }

    /**
     * @description Xử lý stationIds để tạo edges giữa các trạm liên tiếp
     */
    private processStationIds(
        route: RouteEntity,
        stationIds: string[],
        graph: Graph,
        stationMap: Map<string, StationEntity>,
    ): void {
        if (stationIds.length < 2) return;

        // Tạo edges giữa các stations liên tiếp (theo thứ tự)
        for (let i = 0; i < stationIds.length - 1; i++) {
            // stationIds chứa _id, tra cứu station entity
            const fromStation = stationMap.get(stationIds[i]);
            const toStation = stationMap.get(stationIds[i + 1]);

            if (!fromStation || !toStation) continue;

            // Dùng stationCode làm key cho graph nodes (routing service cần stationCode)
            const fromCode = fromStation.stationCode;
            const toCode = toStation.stationCode;

            // Tính khoảng cách từ tọa độ trực tiếp
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

            // Tạo hoặc cập nhật node
            if (!graph.nodes.has(fromCode)) {
                graph.nodes.set(fromCode, {
                    stationCode: fromCode,
                    station: fromStation,
                    neighbors: new Map(),
                });
            }

            if (!graph.nodes.has(toCode)) {
                graph.nodes.set(toCode, {
                    stationCode: toCode,
                    station: toStation,
                    neighbors: new Map(),
                });
            }

            // Tạo edge
            const edge: GraphEdge = {
                from: fromCode,
                to: toCode,
                routeCode: route.routeCode,
                route,
                distance,
                weight: distance, // Mặc định weight = distance
            };

            // Thêm edge vào neighbors (có thể có nhiều routes giữa 2 stations)
            const fromNode = graph.nodes.get(fromCode)!;
            const existingEdge = fromNode.neighbors.get(toCode);

            // Chỉ giữ edge có distance nhỏ nhất nếu có nhiều routes
            if (!existingEdge || edge.distance < existingEdge.distance) {
                fromNode.neighbors.set(toCode, edge);
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
                // Ước tính thời gian dựa trên tốc độ trung bình
                return (edge.distance / AVERAGE_BUS_SPEED) * MINUTES_PER_HOUR;

            case RoutingCriteria.COST:
                // Ước tính chi phí dựa trên giá vé
                return edge.distance * COST_PER_KM;

            default:
                return edge.distance;
        }
    }
}
