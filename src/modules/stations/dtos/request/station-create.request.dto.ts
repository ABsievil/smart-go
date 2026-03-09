import {
    IsString,
    IsEnum,
    IsBoolean,
    IsOptional,
    IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    StationType,
    StationStatus,
} from '@modules/stations/enums/station.enum';

export class StationCreateRequestDto {
    @ApiProperty({ description: 'Station code', example: 'ST001' })
    @IsString()
    stationCode: string;

    @ApiPropertyOptional({
        description: 'Station name',
        example: 'Ben Thanh Station',
    })
    @IsOptional()
    @IsString()
    stationName?: string;

    @ApiProperty({ description: 'Latitude coordinate', example: 10.762622 })
    @IsNumber()
    latitude: number;

    @ApiProperty({ description: 'Longitude coordinate', example: 106.660172 })
    @IsNumber()
    longitude: number;

    @ApiPropertyOptional({ description: 'Station condition', example: 'Good' })
    @IsOptional()
    @IsString()
    condition?: string;

    @ApiPropertyOptional({
        description: 'Stop category',
        example: 'Main Terminal',
    })
    @IsOptional()
    @IsString()
    stopCategory?: string;

    @ApiPropertyOptional({
        description: 'Street name',
        example: 'Lê Lợi',
    })
    @IsOptional()
    @IsString()
    streetName?: string;

    @ApiPropertyOptional({ description: 'Address number', example: '1' })
    @IsOptional()
    @IsString()
    addressNo?: string;

    @ApiPropertyOptional({
        description: 'Has wheelchair access',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    hasWheelchair?: boolean;

    @ApiPropertyOptional({ description: 'Has ramp', example: false })
    @IsOptional()
    @IsBoolean()
    hasRamp?: boolean;

    @ApiProperty({ description: 'Station type', enum: StationType })
    @IsEnum(StationType)
    stationType: StationType;

    @ApiPropertyOptional({
        description: 'Status',
        enum: StationStatus,
        default: StationStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus;
}
