/**
 * Interface cho congestion factors theo giờ
 */
export interface CongestionFactors {
    rushHourMorning: number[]; // 6-9h
    rushHourEvening: number[]; // 16-19h
    normal: number;
}
