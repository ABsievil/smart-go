import { RouteEntity } from '@modules/routes/repositories/entities/route.entity';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';

export interface GraphNode {
    stationCode: string;
    station: StationEntity;
    neighbors: Map<string, GraphEdge[]>;
}

export interface GraphEdge {
    from: string;
    to: string;
    routeCode: string;
    route: RouteEntity;
    distance: number; // km
    weight: number; // có thể là distance, time, hoặc cost
}

export interface Graph {
    nodes: Map<string, GraphNode>;
}
