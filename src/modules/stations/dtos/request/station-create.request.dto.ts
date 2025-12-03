import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    StationType,
    StationStatus,
} from '@modules/stations/enums/station.enum';

export class StationCreateRequestDto {
    @ApiProperty({ description: 'Station name', example: 'Ben Thanh Station' })
    @IsString()
    stationName: string;

    @ApiProperty({ description: 'Station code', example: 'ST001' })
    @IsString()
    stationCode: string;

    @ApiProperty({ description: 'Address' })
    @IsString()
    address: string;

    @ApiPropertyOptional({ description: 'Station URL' })
    @IsOptional()
    @IsString()
    url?: string;

    @ApiProperty({ description: 'Station type', enum: StationType })
    @IsEnum(StationType)
    stationType: StationType;

    @ApiProperty({ description: 'Has shelter', example: true })
    @IsBoolean()
    hasShelter: boolean;

    @ApiProperty({ description: 'Has wheelchair access', example: true })
    @IsBoolean()
    hasWheelchair: boolean;

    @ApiProperty({ description: 'Has elevator', example: false })
    @IsBoolean()
    hasElevator: boolean;

    @ApiProperty({ description: 'Has ramp', example: true })
    @IsBoolean()
    hasRamp: boolean;

    @ApiPropertyOptional({
        description: 'Status',
        enum: StationStatus,
        default: StationStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus;
}
