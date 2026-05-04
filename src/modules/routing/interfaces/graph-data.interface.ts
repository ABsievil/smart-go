import { RouteType } from '@modules/routes/enums/route.enum';

/** Dữ liệu tuyến rút gọn dùng để build graph (chỉ giữ fields cần thiết) */
export interface RouteLite {
    routeCode: string;
    routeName: string;
    stationIds: string[];
    routeType: RouteType;
}

/** Dữ liệu trạm rút gọn dùng để build graph */
export interface StationLite {
    _id: string;
    stationCode: string;
    stationName?: string;
    latitude: number;
    longitude: number;
}
