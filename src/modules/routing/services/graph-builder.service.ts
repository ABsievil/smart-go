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

        // Tạo map stations để tra cứu nhanh
        const stationMap = new Map<string, StationEntity>();
        for (const station of stations) {
            stationMap.set(station.stationCode, station);
        }

        // Xây dựng nodes và edges từ routes
        for (const route of routes) {
            // Xử lý routeForwardCodes (lượt đi)
            if (route.routeForwardCodes) {
                this.processRouteCodes(
                    route,
                    route.routeForwardCodes,
                    graph,
                    stationMap,
                    'forward',
                );
            }

            // Xử lý routeBackwardCodes (lượt về)
            if (route.routeBackwardCodes) {
                this.processRouteCodes(
                    route,
                    route.routeBackwardCodes,
                    graph,
                    stationMap,
                    'backward',
                );
            }
        }

        return graph;
    }

    /**
     * @description Xử lý route codes để tạo edges
     */
    private processRouteCodes(
        route: RouteEntity,
        routeCodes: Map<string, string> | Record<string, string>,
        graph: Graph,
        stationMap: Map<string, StationEntity>,
        direction: 'forward' | 'backward',
    ): void {
        // Map giữ nguyên thứ tự insertion, Object thì không đảm bảo
        // Nếu là Map, giữ nguyên thứ tự; nếu là Object, chuyển sang Array
        const codes =
            routeCodes instanceof Map
                ? Array.from(routeCodes.entries())
                : Object.entries(routeCodes);

        if (codes.length < 2) return;

        // Tạo edges giữa các stations liên tiếp (giữ nguyên thứ tự)
        for (let i = 0; i < codes.length - 1; i++) {
            const fromCode = codes[i][0];
            const toCode = codes[i + 1][0];

            const fromStation = stationMap.get(fromCode);
            const toStation = stationMap.get(toCode);

            if (!fromStation || !toStation) continue;

            // Tính khoảng cách
            let distance = 0;
            if (
                fromStation.coordinates?.latitude &&
                fromStation.coordinates?.longitude &&
                toStation.coordinates?.latitude &&
                toStation.coordinates?.longitude
            ) {
                distance = this.calculateDistance(
                    fromStation.coordinates.latitude,
                    fromStation.coordinates.longitude,
                    toStation.coordinates.latitude,
                    toStation.coordinates.longitude,
                );
            } else {
                // Nếu không có coordinates, sử dụng distance từ routeCodes
                // distanceFromPrevious là khoảng cách từ trạm trước đó
                const distanceStr = codes[i + 1][1];
                distance = parseFloat(distanceStr) || DEFAULT_DISTANCE;
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
