import { RouteType } from '@modules/routes/enums/route.enum';
import {
    AVERAGE_BUS_SPEED,
    AVERAGE_METRO_SPEED_KMH,
    AVERAGE_WATERBUS_SPEED_KMH,
    FARE_PER_BOARDING,
    FARE_METRO_BOARDING_TYPICAL_VND,
    FARE_WATERBUS_BOARDING_VND,
    MINUTES_PER_HOUR,
    REFERENCE_FARE_FOR_OPTIMIZATION_SCORE_VND,
} from '@modules/routing/constants/routing.constants';

export function resolveRouteType(routeType?: RouteType): RouteType {
    return routeType ?? RouteType.BUS;
}

export function getTransitAverageSpeedKmh(routeType?: RouteType): number {
    switch (resolveRouteType(routeType)) {
        case RouteType.METRO:
            return AVERAGE_METRO_SPEED_KMH;
        case RouteType.WATERBUS:
            return AVERAGE_WATERBUS_SPEED_KMH;
        case RouteType.BUS:
        default:
            return AVERAGE_BUS_SPEED;
    }
}

/**
 * Ước lượng vé một lần lên xe theo loại phương tiện (routing — không phải bảng giá đầy đủ).
 */
export function getTransitFareBoardingVnd(routeType?: RouteType): number {
    switch (resolveRouteType(routeType)) {
        case RouteType.METRO:
            return FARE_METRO_BOARDING_TYPICAL_VND;
        case RouteType.WATERBUS:
            return FARE_WATERBUS_BOARDING_VND;
        case RouteType.BUS:
        default:
            return FARE_PER_BOARDING;
    }
}

/** Chỉ bus chịu tắc nghẽn đường bộ; metro / waterbus giữ multiplier 1. */
export function transitUsesRoadCongestion(routeType?: RouteType): boolean {
    return resolveRouteType(routeType) === RouteType.BUS;
}

export function estimateTransitEdgeTimeMinutes(
    distanceKm: number,
    routeType?: RouteType,
): number {
    const speed = getTransitAverageSpeedKmh(routeType);
    return (distanceKm / speed) * MINUTES_PER_HOUR;
}

/** Chuẩn hóa tổng VND vé để cộng vào điểm tối ưu đa mục tiêu (cùng thang với trọng số cũ dùng bus). */
export function fareCostToScoreUnits(totalCostVnd: number): number {
    return totalCostVnd / REFERENCE_FARE_FOR_OPTIMIZATION_SCORE_VND;
}
