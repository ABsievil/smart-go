export const SSE_INTERVAL_MS = 5_000;

// TTL (giây) khớp với chu kỳ SSE — mọi subscriber trong cùng chu kỳ dùng chung 1 bản tính
export const POSITION_CACHE_TTL_S = 5;
export const ETA_CACHE_TTL_S = 5;
export const TRIP_POSITION_CACHE_TTL_S = 5;

/**
 * Redis key factory cho module bus-simulations.
 * Chỉ cache dữ liệu tính toán ngắn hạn (vị trí + ETA),
 * không lưu dữ liệu tĩnh (trips, routes, stations) vào Redis.
 */
export const BusRedisKey = {
    routePositions: (routeId: string) => `bus:pos:${routeId}`,
    stationEtas: (stationId: string) => `bus:eta:${stationId}`,
    tripPosition: (tripId: string) => `bus:trip:${tripId}`,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dateReviver = (_key: string, value: any): any =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
        ? new Date(value)
        : value;
