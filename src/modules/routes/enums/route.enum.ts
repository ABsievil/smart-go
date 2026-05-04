export enum RouteStatus {
    INACTIVE = 'INACTIVE',
    ACTIVE = 'ACTIVE',
    MAINTENANCE = 'MAINTENANCE',
}

export enum RouteType {
    BUS = 'bus',
    METRO = 'metro',
    WATERBUS = 'waterbus',
}

export enum TransportType {
    PHO_THONG_CO_TRO_GIA = 'Phổ thông - Có trợ giá',
    PHO_THONG_KHONG_TRO_GIA = 'Phổ thông - Không trợ giá',
    KHONG_TRO_GIA_DU_LICH = 'Không trợ giá - Du lịch',
    HOC_SINH_CO_TRO_GIA = 'Học sinh - Có trợ giá',
}
