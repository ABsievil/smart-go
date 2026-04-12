import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StationEtaResponseDto {
    @ApiProperty()
    stationId: string;

    @ApiProperty({ description: 'Station index along the route' })
    stationIndex: number;

    @ApiPropertyOptional()
    stationName?: string;

    @ApiProperty({ example: 10.762622 })
    latitude: number;

    @ApiProperty({ example: 106.660172 })
    longitude: number;

    @ApiProperty({ description: 'Estimated arrival time at this station' })
    eta: Date;

    @ApiProperty({ description: 'Minutes until bus arrives (0 if already reached)', example: 4.5 })
    minutesAway: number;

    @ApiProperty({ description: 'Whether the bus has already passed this station' })
    isReached: boolean;
}
