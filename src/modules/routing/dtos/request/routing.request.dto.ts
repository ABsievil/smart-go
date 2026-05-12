import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsInt,
    Min,
    Max,
    ValidateNested,
    IsNumber,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';

/**
 * DTO cho tọa độ (latitude, longitude)
 */
export class CoordinateDto {
    @ApiProperty({
        description: 'Vĩ độ (latitude)',
        example: 10.762622,
    })
    @Expose()
    @IsNumber()
    latitude: number;

    @ApiProperty({
        description: 'Kinh độ (longitude)',
        example: 106.660172,
    })
    @Expose()
    @IsNumber()
    longitude: number;
}

/**
 * DTO cho mã trạm xuất phát và đích
 */
export class StationCodeDto {
    @ApiPropertyOptional({
        description: 'Mã trạm xuất phát',
        example: 'BX_MienTay',
    })
    @Expose()
    @IsOptional()
    @IsString()
    from?: string;

    @ApiPropertyOptional({
        description: 'Mã trạm đích',
        example: 'BX_MienDong',
    })
    @Expose()
    @IsOptional()
    @IsString()
    to?: string;
}

/**
 * DTO cho tọa độ xuất phát và đích
 */
export class CoordinatesDto {
    @ApiPropertyOptional({
        description: 'Tọa độ điểm xuất phát',
        type: CoordinateDto,
    })
    @Expose()
    @IsOptional()
    @ValidateNested()
    @Type(() => CoordinateDto)
    from?: CoordinateDto;

    @ApiPropertyOptional({
        description: 'Tọa độ điểm đích',
        type: CoordinateDto,
    })
    @Expose()
    @IsOptional()
    @ValidateNested()
    @Type(() => CoordinateDto)
    to?: CoordinateDto;
}

/**
 * DTO cho Multi-Objective Routing Request
 * Sử dụng RoutingCriteria để tự động map trọng số
 * Hỗ trợ cả stationCode và coordinates (chỉ cần 1 trong 2)
 */
export class RoutingRequestDto {
    @ApiPropertyOptional({
        description:
            'Mã trạm xuất phát và đích (dùng stationCode HOẶC coordinates)',
        type: StationCodeDto,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => StationCodeDto)
    stationCode?: StationCodeDto;

    @ApiPropertyOptional({
        description:
            'Tọa độ xuất phát và đích (dùng stationCode HOẶC coordinates)',
        type: CoordinatesDto,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CoordinatesDto)
    coordinates?: CoordinatesDto;

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
