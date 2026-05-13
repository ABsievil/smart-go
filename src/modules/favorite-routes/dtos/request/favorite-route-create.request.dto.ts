import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import {
    StationCodeDto,
    CoordinatesDto,
} from '@modules/routing/dtos/request/routing.request.dto';

/**
 * Payload giống phần điểm đi / điểm đến của RoutingRequestDto
 * (stationCode và/hoặc coordinates; phải suy ra được cả from và to).
 */
export class FavoriteRouteCreateRequestDto {
    @ApiProperty({
        description:
            'Tên hiển thị cho lộ trình yêu thích (do client đặt hoặc copy từ Route)',
        example: 'Nhà → Công ty',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    routeName: string;

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
