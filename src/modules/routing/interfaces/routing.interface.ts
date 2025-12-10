export interface StationInfo {
    stationCode: string;
    stationName: string;
    coordinates?: {
        latitude?: number;
        longitude?: number;
    };
}

export interface RouteInfo {
    routeCode: string;
    routeName: string;
}

export interface RouteSegment {
    from: string;
    to: string;
    routeCode: string;
    routeName: string;
    distance: number;
    time: number;
    cost: number;
}

export interface RoutePath {
    stations: StationInfo[];
    routes: RouteInfo[];
    totalDistance: number; // km
    totalTime: number; // phút
    totalCost: number; // VND
    segments: RouteSegment[];
}
