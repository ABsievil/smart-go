import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RouteInfoDto {
    @ApiProperty({ description: 'Mã tuyến' })
    @Expose()
    routeCode: string;

    @ApiProperty({ description: 'Tên tuyến' })
    @Expose()
    routeName: string;
}
