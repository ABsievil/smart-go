import {
    IsString,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsOptional,
    ValidateNested,
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

    @ApiProperty({ description: 'Start point' })
    @IsString()
    startPoint: string;

    @ApiProperty({ description: 'End point' })
    @IsString()
    endPoint: string;

    @ApiProperty({ description: 'Operating hours start', example: '06:00' })
    @IsString()
    operatingHoursStart: string;

    @ApiProperty({ description: 'Operating hours end', example: '22:00' })
    @IsString()
    operatingHoursEnd: string;

    @ApiProperty({ description: 'Frequency in minutes', example: 15 })
    @IsNumber()
    frequency: number;

    @ApiProperty({ description: 'Base fare', example: 10000 })
    @IsNumber()
    baseFare: number;

    @ApiProperty({ description: 'Total distance in km', example: 25.5 })
    @IsNumber()
    totalDistance: number;

    @ApiPropertyOptional({ description: 'Distance', example: 25.5 })
    @IsOptional()
    @IsNumber()
    distance?: number;

    @ApiProperty({ description: 'Is wheelchair accessible', example: false })
    @IsBoolean()
    isWheelchairAccessible: boolean;

    @ApiPropertyOptional({
        description: 'Status',
        enum: RouteStatus,
        default: RouteStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(RouteStatus)
    status?: RouteStatus;

    @ApiPropertyOptional({ description: 'Operating time' })
    @IsOptional()
    @ValidateNested()
    @Type(() => OperatingTimeDto)
    operatingTime?: OperatingTimeDto;

    @ApiPropertyOptional({ description: 'Trip time in minutes' })
    @IsOptional()
    @IsNumber()
    tripTime?: number;

    @ApiPropertyOptional({ description: 'Frequency of each trip' })
    @IsOptional()
    @IsNumber()
    frequencyOfEachTrip?: number;

    @ApiPropertyOptional({
        description: 'Station IDs map',
        example: { station1: 'distance1' },
    })
    @IsOptional()
    stationIds?: Record<string, string>;
}
