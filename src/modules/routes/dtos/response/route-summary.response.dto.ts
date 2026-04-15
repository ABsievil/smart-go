import { ApiProperty } from '@nestjs/swagger';

export class RouteSummaryResponseDto {
    @ApiProperty({
        description: 'Total number of outbound routes (lượt đi)',
        example: 128,
    })
    routeCount: number;

    @ApiProperty({
        description: 'Total number of stations in the system',
        example: 1024,
    })
    stationCount: number;
}
