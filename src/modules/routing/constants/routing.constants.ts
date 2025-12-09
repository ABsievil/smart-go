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
