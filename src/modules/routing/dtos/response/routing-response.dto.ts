import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RoutePathDto } from './route-path.dto';

export class RoutingResponseDto {
    @ApiProperty({ description: 'Đường đi tối ưu', type: RoutePathDto })
    @Expose()
    path: RoutePathDto | null;

    @ApiProperty({ description: 'Thông báo' })
    @Expose()
    message?: string;
}
