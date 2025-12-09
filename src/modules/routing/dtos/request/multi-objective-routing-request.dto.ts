import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsNumber,
    Min,
    Max,
    IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO cho Multi-Objective Routing Request
 * Hỗ trợ trọng số tùy chỉnh theo báo cáo nghiên cứu:
 * h(n) = w1×time + w2×cost + w3×distance
 */
export class MultiObjectiveRoutingRequestDto {
    @ApiProperty({
        description: 'Mã trạm xuất phát',
        example: 'BX_MienTay',
    })
    @IsString()
    fromStationCode: string;

    @ApiProperty({
        description: 'Mã trạm đích',
        example: 'BX_MienDong',
    })
    @IsString()
    toStationCode: string;

    @ApiPropertyOptional({
        description: 'Trọng số cho thời gian (w1) - mặc định 1.0',
        example: 1.0,
        minimum: 0,
        maximum: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Type(() => Number)
    timeWeight?: number = 1.0;

    @ApiPropertyOptional({
        description: 'Trọng số cho chi phí (w2) - mặc định 0.0',
        example: 0.0,
        minimum: 0,
        maximum: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Type(() => Number)
    costWeight?: number = 0.0;

    @ApiPropertyOptional({
        description: 'Trọng số cho khoảng cách (w3) - mặc định 0.0',
        example: 0.0,
        minimum: 0,
        maximum: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Type(() => Number)
    distanceWeight?: number = 0.0;

    @ApiPropertyOptional({
        description:
            'Số lượng lộ trình tối ưu Pareto trả về (MOA*) - mặc định 3',
        example: 3,
        minimum: 1,
        maximum: 10,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    @Type(() => Number)
    numPaths?: number = 3;

    @ApiPropertyOptional({
        description: 'Số lần chuyển tuyến tối đa cho phép',
        example: 3,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    maxTransfers?: number;

    @ApiPropertyOptional({
        description:
            'Giờ trong ngày (0-23) để tính toán tắc nghẽn - mặc định giờ hiện tại',
        example: 8,
        minimum: 0,
        maximum: 23,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(23)
    @Type(() => Number)
    timeOfDay?: number;

    @ApiPropertyOptional({
        description:
            'Bật/tắt tích hợp dữ liệu tắc nghẽn giờ cao điểm - mặc định true',
        example: true,
    })
    @IsOptional()
    congestionAware?: boolean = true;
}
