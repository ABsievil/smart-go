import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import {
    StationType,
    StationStatus,
} from '@modules/stations/enums/station.enum';

export class StationGetResponseDto extends BaseResponseDto {
    @ApiProperty({ description: 'Station code' })
    @Expose()
    stationCode: string;

    @ApiPropertyOptional({ description: 'Station name' })
    @Expose()
    stationName?: string;

    @ApiProperty({ description: 'Latitude coordinate' })
    @Expose()
    latitude: number;

    @ApiProperty({ description: 'Longitude coordinate' })
    @Expose()
    longitude: number;

    @ApiPropertyOptional({ description: 'Station condition' })
    @Expose()
    condition?: string;

    @ApiPropertyOptional({ description: 'Stop category' })
    @Expose()
    stopCategory?: string;

    @ApiPropertyOptional({ description: 'Street name' })
    @Expose()
    streetName?: string;

    @ApiPropertyOptional({ description: 'Address number' })
    @Expose()
    addressNo?: string;

    @ApiPropertyOptional({ description: 'Has wheelchair access' })
    @Expose()
    hasWheelchair?: boolean;

    @ApiPropertyOptional({ description: 'Has ramp' })
    @Expose()
    hasRamp?: boolean;

    @ApiProperty({ description: 'Station type', enum: StationType })
    @Expose()
    stationType: StationType;

    @ApiProperty({ description: 'Status', enum: StationStatus })
    @Expose()
    status: StationStatus;
}
