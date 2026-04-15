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

/**
 * Chặng đi bộ chuyển tuyến giữa 2 trạm trong hành trình
 * (khác với walking leg đầu/cuối từ/đến tọa độ người dùng)
 */
export interface TransferWalkingLeg {
    fromStationCode: string;
    fromStationName: string;
    toStationCode: string;
    toStationName: string;
    fromCoordinates: { latitude: number; longitude: number };
    toCoordinates: { latitude: number; longitude: number };
    distanceKm: number;
    estimatedTimeMinutes: number;
}

export interface RoutePath {
    stations: StationInfo[];
    routes: RouteInfo[];
    /** Tổng khoảng cách xe buýt (km) — chưa bao gồm walking transfer */
    totalDistance: number;
    /** Tổng thời gian xe buýt (phút, chưa có congestion) — chưa bao gồm walking transfer */
    totalTime: number;
    totalCost: number; // VND
    segments: RouteSegment[];
    /** Các chặng đi bộ chuyển tuyến giữa các trạm trong hành trình */
    transferWalkingLegs?: TransferWalkingLeg[];
}
