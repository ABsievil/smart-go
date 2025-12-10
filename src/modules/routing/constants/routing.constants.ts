/**
 * Constants cho routing module
 */

// Cache
export const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 phút

// Tốc độ và chi phí
export const AVERAGE_BUS_SPEED = 30; // km/h
export const COST_PER_KM = 10000; // VND/km
export const DEFAULT_DISTANCE = 1; // km (khi không có coordinates)

// Earth radius cho Haversine formula
export const EARTH_RADIUS_KM = 6371; // km

// Pagination cho graph building
export const MAX_ROUTES_PER_PAGE = 10000;
export const MAX_STATIONS_PER_PAGE = 10000;

// Conversion factors
export const MINUTES_PER_HOUR = 60;
export const DEGREES_TO_RADIANS = Math.PI / 180;

// Congestion factors
export const CONGESTION_MULTIPLIER = 1.2; // +20% thời gian trong giờ cao điểm
export const NORMAL_TRAFFIC_MULTIPLIER = 1.0;
export const RUSH_HOUR_MORNING_START = 6;
export const RUSH_HOUR_MORNING_END = 9;
export const RUSH_HOUR_EVENING_START = 16;
export const RUSH_HOUR_EVENING_END = 19;

// Weight configurations cho Multi-Objective A*
export const WEIGHT_CONFIG_FASTEST = {
    timeWeight: 1.0,
    costWeight: 0.0,
    distanceWeight: 0.0,
};

export const WEIGHT_CONFIG_CHEAPEST = {
    timeWeight: 0.0,
    costWeight: 1.0,
    distanceWeight: 0.0,
};

export const WEIGHT_CONFIG_SHORTEST = {
    timeWeight: 0.0,
    costWeight: 0.0,
    distanceWeight: 1.0,
};

export const WEIGHT_CONFIG_BALANCED = {
    timeWeight: 0.5,
    costWeight: 0.3,
    distanceWeight: 0.2,
};
