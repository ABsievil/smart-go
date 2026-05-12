import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import {
    StationCodeDto,
    CoordinatesDto,
} from '@modules/routing/dtos/request/routing.request.dto';

export class FavoriteRouteGetResponseDto extends BaseResponseDto {
    @ApiProperty({ description: 'User ID owner' })
    @Expose()
    userId: string;

    @ApiPropertyOptional({
        type: StationCodeDto,
        description: 'Mã trạm xuất phát / đích (nếu có)',
    })
    @Expose()
    @Type(() => StationCodeDto)
    stationCode?: StationCodeDto;

    @ApiPropertyOptional({
        type: CoordinatesDto,
        description: 'Tọa độ điểm xuất phát / đích (nếu có)',
    })
    @Expose()
    @Type(() => CoordinatesDto)
    coordinates?: CoordinatesDto;
}
