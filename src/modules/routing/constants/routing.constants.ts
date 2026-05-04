/**
 * Constants cho routing module
 * Request
 * ↓
 * Redis routing result cache (TTL 5 phút)
 * ↓ miss
 * In-memory graph cache (TTL 5 phút, per-instance)
 * ↓ miss
 * Redis raw data cache (TTL 10 phút, shared giữa instances)
 * ↓ miss
 * MongoDB (query thực sự — tối thiểu 1 lần / 10 phút)
 */

// ─── Cache (in-memory) ────────────────────────────────────────────────────────
// TTL cho graph đã build lưu trong bộ nhớ process (ms)
export const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 phút

// ─── Cache (Redis) ────────────────────────────────────────────────────────────
// TTL cho raw DB data (routes + stations) dùng để build graph
// Phải ≥ GRAPH_CACHE_TTL để in-memory cache không rebuild liên tục từ DB
export const GRAPH_DATA_REDIS_TTL_SECONDS = 10 * 60; // 10 phút

// TTL cho kết quả routing đã tính — ổn định trong cùng traffic bucket
export const ROUTING_RESULT_CACHE_TTL_SECONDS = 5 * 60; // 5 phút

// ─── Redis keys ───────────────────────────────────────────────────────────────
export const REDIS_KEY_GRAPH_ROUTES = 'routing:graph:routes';
export const REDIS_KEY_GRAPH_STATIONS = 'routing:graph:stations';

// ─── Tốc độ (trung bình có dừng trạm) ─────────────────────────────────────────
export const AVERAGE_BUS_SPEED = 20; // km/h — đường bộ
/** Metro đô thị (ví dụ tuyến 1 HCMC): tốc độ vận hành có dừng ga */
export const AVERAGE_METRO_SPEED_KMH = 38;
/** Waterbus trên kênh/sông — chậm hơn ô tô và metro */
export const AVERAGE_WATERBUS_SPEED_KMH = 17;

/**
 * H(n) dùng tốc độ nhanh nhất trong các phương thức → ước lượng thời gian lạc quan
 * (lower bound) → heuristic vẫn admissible cho A*.
 */
export const HEURISTIC_LOWER_BOUND_TRANSIT_SPEED_KMH = Math.max(
    AVERAGE_BUS_SPEED,
    AVERAGE_METRO_SPEED_KMH,
    AVERAGE_WATERBUS_SPEED_KMH,
);

// ─── Chi phí lên xe (ước lượng cho routing — có thể tinh chỉnh theo bảng giá) ─
export const FARE_PER_BOARDING = 6000; // VND — bus Phổ thông có trợ giá
/** Metro vé theo quãng đường — dùng đại diện trung bình cho cost trong graph */
export const FARE_METRO_BOARDING_TYPICAL_VND = 20000;
export const FARE_WATERBUS_BOARDING_VND = 15000;

/** Quy đổi tổng chi phí VND trong optimization score về “đơn vị” cùng thang vé bus */
export const REFERENCE_FARE_FOR_OPTIMIZATION_SCORE_VND = FARE_PER_BOARDING;

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
export const RUSH_HOUR_MORNING_START = 6; // 6:00
export const RUSH_HOUR_MORNING_END = 9; // 9:00
export const RUSH_HOUR_EVENING_START = 16; // 16:00
export const RUSH_HOUR_EVENING_END = 20; // 20:00 (kẹt xe kéo dài đến 8 PM)

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

// CHEAPEST: ưu tiên số lần lên xe (cost), nhưng thêm distanceWeight nhỏ để:
//   1. Heuristic ≠ 0 → A* có hướng thay vì trở thành BFS không định hướng
//   2. Các cạnh trong cùng tuyến có weight > 0 → tránh đi vòng vô hạn
export const WEIGHT_CONFIG_CHEAPEST = {
    timeWeight: 0.0,
    costWeight: 1.0,
    distanceWeight: 0.001,
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

// Khoảng cách đi bộ tối đa cho mỗi lần chuyển tuyến giữa 2 trạm (walking transfer edge).
export const MAX_TRANSFER_WALKING_DISTANCE_KM = 1; // km (~12 phút đi bộ)

// Tổng khoảng cách đi bộ tối đa cho toàn bộ hành trình (transfer + đầu/cuối).
// Vượt ngưỡng này → lộ trình bị loại bỏ.
export const MAX_TOTAL_WALKING_DISTANCE_KM = 1.5; // km (~18 phút đi bộ)

// Route code đặc biệt đánh dấu cạnh đi bộ chuyển tuyến trong đồ thị
export const WALKING_TRANSFER_ROUTE_CODE = '__WALKING__';

// BALANCED: cân bằng thực sự giữa 3 chiều.
// Phân tích đơn vị (hành trình điển hình: 30 phút, 2 lần lên xe × 6000 VND, 10 km):
//   - timeWeight=0.5  → 0.5 × 30 = 15
//   - costWeight=0.00008 → 0.00008 × 12000 = 0.96  (~6% của time)
//   - distanceWeight=0.1 → 0.1 × 10 = 1.0  (~7% của time)
// Cost đủ để phân biệt 1 vs 3 lần lên xe mà không áp đảo time.
export const WEIGHT_CONFIG_BALANCED = {
    timeWeight: 0.5,
    costWeight: 0.00008,
    distanceWeight: 0.1,
};
