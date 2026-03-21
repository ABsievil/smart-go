/**
 * Constants cho routing module
 */

// Cache
export const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 phút

// ─── Tốc độ ───────────────────────────────────────────────────────────────────
export const AVERAGE_BUS_SPEED = 20; // km/h

// ─── Chi phí xe buýt Việt Nam ─────────────────────────────────────────────────
export const FARE_PER_BOARDING = 6000; // VND/lần lên xe (giá vé phổ thông)

// Thời gian chờ trung bình tại trạm khi chuyển tuyến
export const TRANSFER_WAIT_TIME = 5; // phút

// ─── Fallback ─────────────────────────────────────────────────────────────────
export const DEFAULT_DISTANCE = 1; // km (khi không có coordinates)

// ─── Haversine formula ────────────────────────────────────────────────────────
export const EARTH_RADIUS_KM = 6371; // km

// ─── Pagination cho graph building ───────────────────────────────────────────
export const MAX_ROUTES_PER_PAGE = 10000;
export const MAX_STATIONS_PER_PAGE = 10000;

// ─── Conversion ───────────────────────────────────────────────────────────────
export const MINUTES_PER_HOUR = 60;
export const DEGREES_TO_RADIANS = Math.PI / 180;

// ─── Tắc nghẽn giao thông TP.HCM ─────────────────────────────────────────────
// Thực tế HCMC: giờ cao điểm tăng ~30% thời gian di chuyển
export const CONGESTION_MULTIPLIER = 1.3; // +30% thời gian giờ cao điểm
export const NORMAL_TRAFFIC_MULTIPLIER = 1.0;

// Giờ cao điểm TP.HCM (giờ địa phương)
export const RUSH_HOUR_MORNING_START = 6;  // 6:00
export const RUSH_HOUR_MORNING_END = 9;    // 9:00
export const RUSH_HOUR_EVENING_START = 16; // 16:00
export const RUSH_HOUR_EVENING_END = 20;   // 20:00 (kẹt xe kéo dài đến 8 PM)

// ─── Weight configurations cho Multi-Objective A* ─────────────────────────────
//
// Lưu ý về scale của các chiều tối ưu:
//   - time     : phút (~10–60 min)
//   - cost     : VND  (~6.000–18.000 VND, tính khi lên xe mới)
//   - distance : km   (~1–20 km)
//
// CHEAPEST/FASTEST/SHORTEST dùng weight đơn (1.0 / 0.0)  → scale không quan trọng.
// BALANCED cần điều chỉnh costWeight để VND không áp đảo các chiều còn lại:
//   ví dụ: 2 lần lên xe × 6000 × 0.00003 ≈ 0.36 (tương đương distance × 0.02)

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

// ─── Đi bộ ───────────────────────────────────────────────────────────────────
export const WALKING_SPEED_KMH = 5; // km/h (tốc độ đi bộ trung bình)
export const CANDIDATE_STATIONS_COUNT = 3; // top-N trạm gần nhất xem xét khi tìm đường từ tọa độ
// Khoảng cách đi bộ tối đa chấp nhận được để đến/từ trạm xe buýt tại TP.HCM.
// Nếu không có trạm nào trong bán kính này, fallback dần lên MAX_WALKING_DISTANCE_KM_FALLBACK.
export const MAX_WALKING_DISTANCE_KM = 1.0; // km (~12 phút đi bộ)
export const MAX_WALKING_DISTANCE_KM_FALLBACK = 3.0; // km — dùng khi không có trạm nào ≤ 1km

// Balanced: ưu tiên thời gian, phạt nhẹ số lần chuyển tuyến và khoảng cách
// costWeight nhỏ để bù cho đơn vị VND lớn hơn nhiều so với phút và km
export const WEIGHT_CONFIG_BALANCED = {
    timeWeight: 0.5,
    costWeight: 0.00003,
    distanceWeight: 0.02,
};
