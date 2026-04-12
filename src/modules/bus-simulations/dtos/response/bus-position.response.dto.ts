import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusTripStatus } from '@modules/bus-simulations/enums/bus-simulation.enum';
import { StationEtaResponseDto } from '@modules/bus-simulations/dtos/response/station-eta.response.dto';

export class BusPositionResponseDto {
    @ApiProperty()
    tripId: string;

    @ApiProperty()
    routeId: string;

    @ApiProperty({ example: '1' })
    routeCode: string;

    @ApiProperty({ example: 'Lượt đi: Bến Thành - BX Chợ Lớn' })
    routeName: string;

    @ApiProperty({ description: 'Server timestamp of this snapshot' })
    timestamp: Date;

    @ApiProperty({ example: 10.762622 })
    latitude: number;

    @ApiProperty({ example: 106.660172 })
    longitude: number;

    @ApiProperty({ description: 'Index of the station the bus just departed from' })
    currentStationIndex: number;

    @ApiProperty({ description: 'ID of the last-passed station' })
    currentStationId: string;

    @ApiPropertyOptional({ description: 'ID of the next upcoming station, null at end of route' })
    nextStationId: string | null;

    @ApiProperty({ description: 'Interpolation progress toward next station (0–1)', example: 0.45 })
    progressToNextStation: number;

    @ApiProperty({ enum: BusTripStatus })
    status: BusTripStatus;

    @ApiProperty({ description: 'Scheduled departure time' })
    departureTime: Date;

    @ApiProperty({ description: 'Expected arrival time at last station' })
    expectedArrivalTime: Date;

    @ApiProperty({ description: 'Minutes elapsed since departure', example: 12.3 })
    elapsedMinutes: number;

    @ApiProperty({ description: 'Minutes remaining until final station', example: 22.7 })
    remainingMinutes: number;

    @ApiProperty({ type: [StationEtaResponseDto], description: 'ETA for every station on this trip' })
    stationEtas: StationEtaResponseDto[];
}
