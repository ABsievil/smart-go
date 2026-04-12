export const SSE_INTERVAL_MS = 5_000;

// TTL (giây) cho cache vị trí xe trên một tuyến — khớp với chu kỳ SSE
export const POSITION_CACHE_TTL_S = 5;

// TTL (giây) cho cache ETA tại một trạm — khớp với chu kỳ SSE
export const ETA_CACHE_TTL_S = 5;

/**
 * Redis key factory cho module bus-simulations.
 * Chỉ cache dữ liệu tính toán ngắn hạn (vị trí + ETA),
 * không lưu dữ liệu tĩnh (trips, routes, stations) vào Redis.
 */
export const BusRedisKey = {
    routePositions: (routeId: string) => `bus:pos:${routeId}`,
    stationEtas: (stationId: string) => `bus:eta:${stationId}`,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dateReviver = (_key: string, value: any): any =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
        ? new Date(value)
        : value;
