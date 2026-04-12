import { ApiProperty } from '@nestjs/swagger';
import { BusTripStatus } from '@modules/bus-simulations/enums/bus-simulation.enum';

export class BusTripResponseDto {
    @ApiProperty({ description: 'Unique trip instance ID (UUID)' })
    tripId: string;

    @ApiProperty({ description: 'Route ID' })
    routeId: string;

    @ApiProperty({ description: 'Route code', example: '1' })
    routeCode: string;

    @ApiProperty({ description: 'Route name', example: 'Lượt đi: Bến Thành - BX Chợ Lớn' })
    routeName: string;

    @ApiProperty({ description: 'Scheduled departure time' })
    departureTime: Date;

    @ApiProperty({ description: 'Expected arrival time at last station' })
    expectedArrivalTime: Date;

    @ApiProperty({ enum: BusTripStatus, description: 'Current trip status' })
    status: BusTripStatus;

    @ApiProperty({ description: 'Total trip duration in minutes', example: 35 })
    tripDurationMinutes: number;

    @ApiProperty({ type: [String], description: 'Ordered list of station IDs' })
    stationIds: string[];
}
