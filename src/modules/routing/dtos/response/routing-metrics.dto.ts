import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * DTO cho metrics của thuật toán routing
 * Theo báo cáo nghiên cứu về hiệu suất A* vs Dijkstra
 */
export class RoutingMetricsDto {
    @ApiProperty({
        description: 'Thuật toán được sử dụng',
        example: 'A*',
    })
    @Expose()
    algorithm: string;

    @ApiProperty({
        description: 'Thời gian thực thi (milliseconds)',
        example: 85,
    })
    @Expose()
    executionTimeMs: number;

    @ApiProperty({
        description: 'Số nodes đã khám phá',
        example: 42,
    })
    @Expose()
    nodesExplored: number;

    @ApiProperty({
        description: 'Tỷ lệ % nodes khám phá so với tổng số nodes trong graph',
        example: 4.2,
    })
    @Expose()
    explorationRatePercent: number;

    @ApiProperty({
        description: 'Heuristic có được sử dụng không',
        example: true,
    })
    @Expose()
    heuristicUsed: boolean;

    @ApiProperty({
        description: 'Có fallback sang thuật toán khác không',
        example: false,
    })
    @Expose()
    hasFallback: boolean;

    @ApiProperty({
        description: 'Cache hit cho graph',
        example: true,
    })
    @Expose()
    cacheHit: boolean;
}
