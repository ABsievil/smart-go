import { RouteType } from '@modules/routes/enums/route.enum';

/**
 * @description Chỉ giữ các field cần thiết cho thuật toán routing.
 * Không lưu full RouteEntity / StationEntity để giảm bộ nhớ.
 */
export interface GraphStationLite {
    stationName?: string;
    latitude: number;
    longitude: number;
}

export interface GraphRouteLite {
    routeName?: string;
}

export interface GraphNode {
    stationCode: string;
    station: GraphStationLite;
    neighbors: Map<string, GraphEdge[]>;
}

export interface GraphEdge {
    from: string;
    to: string;
    routeCode: string;
    route: GraphRouteLite;
    routeType?: RouteType;
    distance: number;
    weight: number;
    isWalkingEdge?: boolean;
}

export interface Graph {
    nodes: Map<string, GraphNode>;
}
