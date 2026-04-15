import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { RoutingMetricsDto } from './routing-metrics.dto';
import { ENUM_WALKING_LEG_TYPE } from '@modules/routing/enums/routing.enum';

/**
 * Chặng đi bộ trong lộ trình:
 * - TO_FIRST_STATION: từ vị trí người dùng đến trạm đầu tiên
 * - FROM_LAST_STATION: từ trạm cuối đến điểm đích người dùng
 * - TRANSFER: đi bộ giữa 2 trạm gần nhau để chuyển sang tuyến khác
 */
export class WalkingLegDto {
    @ApiProperty({
        description: 'Loại chặng đi bộ',
        enum: ENUM_WALKING_LEG_TYPE,
        example: ENUM_WALKING_LEG_TYPE.TO_FIRST_STATION,
    })
    @Expose()
    type: ENUM_WALKING_LEG_TYPE;

    @ApiProperty({
        description: 'Tọa độ điểm bắt đầu đi bộ',
        example: { latitude: 10.762622, longitude: 106.660172 },
    })
    @Expose()
    fromCoordinates: { latitude: number; longitude: number };

    @ApiProperty({
        description: 'Tọa độ điểm kết thúc đi bộ',
        example: { latitude: 10.758, longitude: 106.658 },
    })
    @Expose()
    toCoordinates: { latitude: number; longitude: number };

    @ApiProperty({
        description:
            'Mã trạm liên quan (trạm lên xe cho TO_FIRST_STATION/TRANSFER, trạm xuống xe cho FROM_LAST_STATION)',
        example: 'BX_MienTay',
    })
    @Expose()
    stationCode: string;

    @ApiProperty({ description: 'Tên trạm liên quan', example: 'Bến xe Miền Tây' })
    @Expose()
    stationName: string;

    @ApiPropertyOptional({
        description: 'Mã trạm xuất phát (chỉ có khi type = TRANSFER)',
        example: 'TramA',
    })
    @Expose()
    fromStationCode?: string;

    @ApiPropertyOptional({
        description: 'Tên trạm xuất phát (chỉ có khi type = TRANSFER)',
        example: 'Trạm A',
    })
    @Expose()
    fromStationName?: string;

    @ApiProperty({ description: 'Khoảng cách đi bộ (km)', example: 0.35 })
    @Expose()
    distanceKm: number;

    @ApiProperty({
        description: 'Thời gian đi bộ ước tính (phút, tốc độ 5 km/h)',
        example: 4,
    })
    @Expose()
    estimatedTimeMinutes: number;
}

/**
 * Thông tin một segment trong lộ trình
 */
export class RouteSegmentDto {
    @ApiProperty({ description: 'Mã trạm đi', example: 'BX_MienTay' })
    @Expose()
    from: string;

    @ApiProperty({ description: 'Mã trạm đến', example: 'TramA' })
    @Expose()
    to: string;

    @ApiProperty({ description: 'Mã tuyến', example: 'Route01' })
    @Expose()
    routeCode: string;

    @ApiProperty({ description: 'Tên tuyến', example: 'Tuyến 01' })
    @Expose()
    routeName: string;

    @ApiProperty({ description: 'Khoảng cách (km)', example: 5.2 })
    @Expose()
    distance: number;

    @ApiProperty({ description: 'Thời gian (phút)', example: 12 })
    @Expose()
    time: number;

    @ApiProperty({ description: 'Chi phí (VND)', example: 7000 })
    @Expose()
    cost: number;
}

/**
 * Thông tin một lộ trình tối ưu Pareto
 */
export class ParetoOptimalPathDto {
    @ApiProperty({
        description: 'Danh sách trạm trong lộ trình',
        type: [Object],
    })
    @Expose()
    stations: Array<{
        stationCode: string;
        stationName: string;
        coordinates?: { latitude: number; longitude: number };
    }>;

    @ApiProperty({ description: 'Danh sách tuyến sử dụng', type: [Object] })
    @Expose()
    routes: Array<{
        routeCode: string;
        routeName: string;
    }>;

    @ApiProperty({
        description:
            'Tổng khoảng cách (km) — bao gồm cả đoạn đi bộ nếu input là tọa độ',
        example: 16.3,
    })
    @Expose()
    totalDistance: number;

    @ApiProperty({
        description:
            'Tổng thời gian (phút) — bao gồm cả đoạn đi bộ nếu input là tọa độ',
        example: 43,
    })
    @Expose()
    totalTime: number;

    @ApiProperty({ description: 'Tổng chi phí (VND)', example: 21000 })
    @Expose()
    totalCost: number;

    @ApiProperty({
        description: 'Số lần chuyển tuyến',
        example: 2,
    })
    @Expose()
    transfers: number;

    @ApiProperty({
        description: 'Chi tiết segments xe buýt',
        type: [RouteSegmentDto],
    })
    @Expose()
    @Type(() => RouteSegmentDto)
    segments: RouteSegmentDto[];

    @ApiProperty({
        description: 'Điểm tối ưu (càng thấp càng tốt) - tổng trọng số',
        example: 0.85,
    })
    @Expose()
    optimizationScore: number;

    @ApiProperty({
        description: 'Loại tối ưu (fastest/cheapest/shortest/balanced)',
        example: 'fastest',
    })
    @Expose()
    optimizationType:
        | 'fastest'
        | 'cheapest'
        | 'shortest'
        | 'balanced'
        | 'custom';

    @ApiPropertyOptional({
        description:
            'Chặng đi bộ (chỉ có khi input là tọa độ): đi bộ từ vị trí người dùng đến trạm đầu, và/hoặc từ trạm cuối đến đích',
        type: [WalkingLegDto],
    })
    @Expose()
    @Type(() => WalkingLegDto)
    walkingLegs?: WalkingLegDto[];

    @ApiPropertyOptional({
        description:
            'Khoảng cách di chuyển bằng xe buýt (km), không bao gồm đi bộ',
        example: 15.6,
    })
    @Expose()
    transitDistanceKm?: number;

    @ApiPropertyOptional({
        description:
            'Thời gian di chuyển bằng xe buýt (phút), không bao gồm đi bộ',
        example: 35,
    })
    @Expose()
    transitTimeMinutes?: number;

    @ApiPropertyOptional({
        description: 'Tổng khoảng cách đi bộ (km)',
        example: 0.7,
    })
    @Expose()
    totalWalkingDistanceKm?: number;

    @ApiPropertyOptional({
        description: 'Tổng thời gian đi bộ ước tính (phút)',
        example: 8,
    })
    @Expose()
    totalWalkingTimeMinutes?: number;
}

/**
 * Response cho Multi-Objective Routing
 */
export class RoutingResponseDto {
    @ApiProperty({
        description: 'Danh sách các lộ trình tối ưu Pareto',
        type: [ParetoOptimalPathDto],
    })
    @Expose()
    @Type(() => ParetoOptimalPathDto)
    paths: ParetoOptimalPathDto[];

    @ApiProperty({
        description: 'Metrics về hiệu suất thuật toán',
        type: RoutingMetricsDto,
    })
    @Expose()
    @Type(() => RoutingMetricsDto)
    metrics: RoutingMetricsDto;

    @ApiProperty({
        description: 'Có áp dụng dữ liệu tắc nghẽn không',
        example: true,
    })
    @Expose()
    congestionApplied: boolean;

    @ApiProperty({
        description: 'Giờ trong ngày được sử dụng cho tính toán',
        example: 8,
    })
    @Expose()
    timeOfDay: number;
}
