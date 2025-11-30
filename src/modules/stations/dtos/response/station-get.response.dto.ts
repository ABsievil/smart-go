import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import {
    StationType,
    StationStatus,
} from '@modules/stations/enums/station.enum';

export class StationGetResponseDto extends BaseResponseDto {
    @ApiProperty({ description: 'Station name' })
    @Expose()
    stationName: string;

    @ApiProperty({ description: 'Station code' })
    @Expose()
    stationCode: string;

    @ApiProperty({ description: 'Address' })
    @Expose()
    address: string;

    @ApiProperty({ description: 'Station type', enum: StationType })
    @Expose()
    stationType: StationType;

    @ApiProperty({ description: 'Has shelter' })
    @Expose()
    hasShelter: boolean;

    @ApiProperty({ description: 'Has wheelchair access' })
    @Expose()
    hasWheelchair: boolean;

    @ApiProperty({ description: 'Has elevator' })
    @Expose()
    hasElevator: boolean;

    @ApiProperty({ description: 'Has ramp' })
    @Expose()
    hasRamp: boolean;

    @ApiProperty({ description: 'Status', enum: StationStatus })
    @Expose()
    status: StationStatus;
}
