import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';

/**
 * DTO cho Multi-Objective Routing Request
 * Sử dụng RoutingCriteria để tự động map trọng số
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
        description:
            'Tiêu chí tối ưu (time, cost, distance, hoặc balanced) - mặc định TIME',
        enum: RoutingCriteria,
        default: RoutingCriteria.TIME,
        required: false,
    })
    @IsEnum(RoutingCriteria)
    @IsOptional()
    criteria?: RoutingCriteria = RoutingCriteria.TIME;

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
