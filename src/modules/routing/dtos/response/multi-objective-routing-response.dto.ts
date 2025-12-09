import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { RoutingMetricsDto } from './routing-metrics.dto';

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

    @ApiProperty({ description: 'Tổng khoảng cách (km)', example: 15.6 })
    @Expose()
    totalDistance: number;

    @ApiProperty({ description: 'Tổng thời gian (phút)', example: 35 })
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

    @ApiProperty({ description: 'Chi tiết segments', type: [RouteSegmentDto] })
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
}

/**
 * Response cho Multi-Objective Routing
 */
export class MultiObjectiveRoutingResponseDto {
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
