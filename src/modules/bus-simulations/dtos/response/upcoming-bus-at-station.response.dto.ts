import { ApiProperty } from '@nestjs/swagger';
import { StationEtaResponseDto } from '@modules/bus-simulations/dtos/response/station-eta.response.dto';

export class UpcomingBusAtStationResponseDto {
    @ApiProperty({ description: 'Trip instance ID (UUID)' })
    tripId: string;

    @ApiProperty({ description: 'Route entity ID' })
    routeId: string;

    @ApiProperty({ example: '1' })
    routeCode: string;

    @ApiProperty({ example: 'Lượt đi: Bến Thành - BX Chợ Lớn' })
    routeName: string;

    @ApiProperty({ type: () => StationEtaResponseDto, description: 'ETA detail for this station' })
    eta: StationEtaResponseDto;
}
