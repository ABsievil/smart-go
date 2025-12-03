import {
    IsString,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsOptional,
    ValidateNested,
    IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportType, RouteStatus } from '@modules/routes/enums/route.enum';

class OperatingTimeDto {
    @ApiPropertyOptional({ description: 'Operating time from' })
    @IsOptional()
    @IsString()
    from?: string;

    @ApiPropertyOptional({ description: 'Operating time to' })
    @IsOptional()
    @IsString()
    to?: string;
}

export class RouteCreateRequestDto {
    @ApiProperty({ description: 'Route code', example: 'R001' })
    @IsString()
    routeCode: string;

    @ApiProperty({ description: 'Route name', example: 'Route 1 - Tuyến 1' })
    @IsString()
    routeName: string;

    @ApiProperty({ description: 'Transport type', enum: TransportType })
    @IsEnum(TransportType)
    transportType: TransportType;

    @ApiPropertyOptional({
        description: 'Status',
        enum: RouteStatus,
        default: RouteStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(RouteStatus)
    status?: RouteStatus;

    @ApiPropertyOptional({ description: 'Operator name' })
    @IsOptional()
    @IsString()
    operatorName?: string;

    @ApiPropertyOptional({
        description: 'Phone number',
        example: '028.3776.3777',
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({ description: 'Vehicle type', example: '50 chỗ' })
    @IsOptional()
    @IsString()
    vehicleType?: string;

    @ApiPropertyOptional({ description: 'Start point' })
    @IsOptional()
    @IsString()
    startPoint?: string;

    @ApiPropertyOptional({ description: 'End point' })
    @IsOptional()
    @IsString()
    endPoint?: string;

    @ApiPropertyOptional({ description: 'Frequency', example: '15 - 18 phút' })
    @IsOptional()
    @IsString()
    frequency?: string;

    @ApiPropertyOptional({
        description: 'Base fare',
        type: [String],
        example: [
            'Vé lượt trợ giá: 5,000 VNĐ',
            'Vé lượt trợ giá HSSV: 3,000 VNĐ',
        ],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    baseFare?: string[];

    @ApiPropertyOptional({ description: 'Total distance in km', example: 8.59 })
    @IsOptional()
    @IsNumber()
    totalDistance?: number;

    @ApiPropertyOptional({
        description: 'Is wheelchair accessible',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isWheelchairAccessible?: boolean;

    @ApiPropertyOptional({ description: 'Operating time' })
    @IsOptional()
    @ValidateNested()
    @Type(() => OperatingTimeDto)
    operatingTime?: OperatingTimeDto;

    @ApiPropertyOptional({ description: 'Trip time', example: '35 phút' })
    @IsOptional()
    @IsString()
    tripTime?: string;

    @ApiPropertyOptional({
        description: 'Number of trips',
        example: '120 chuyến/ngày',
    })
    @IsOptional()
    @IsString()
    numTrips?: string;

    @ApiPropertyOptional({
        description: 'Route forward station codes map',
        example: { ST001: '0.5 km', ST002: '1.2 km' },
    })
    @IsOptional()
    routeForwardCodes?: Record<string, string>;

    @ApiPropertyOptional({
        description: 'Route backward station codes map',
        example: { ST001: '0.5 km', ST002: '1.2 km' },
    })
    @IsOptional()
    routeBackwardCodes?: Record<string, string>;
}
