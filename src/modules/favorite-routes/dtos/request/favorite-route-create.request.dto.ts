import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import {
    StationCodeDto,
    CoordinatesDto,
} from '@modules/routing/dtos/request/routing.request.dto';

/**
 * Payload giống phần điểm đi / điểm đến của RoutingRequestDto
 * (stationCode và/hoặc coordinates; phải suy ra được cả from và to).
 */
export class FavoriteRouteCreateRequestDto {
    @ApiPropertyOptional({ type: StationCodeDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => StationCodeDto)
    stationCode?: StationCodeDto;

    @ApiPropertyOptional({ type: CoordinatesDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CoordinatesDto)
    coordinates?: CoordinatesDto;
}
