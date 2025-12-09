import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SegmentDto {
    @ApiProperty({ description: 'Mã trạm xuất phát' })
    @Expose()
    from: string;

    @ApiProperty({ description: 'Mã trạm đích' })
    @Expose()
    to: string;

    @ApiProperty({ description: 'Mã tuyến' })
    @Expose()
    routeCode: string;

    @ApiProperty({ description: 'Tên tuyến' })
    @Expose()
    routeName: string;

    @ApiProperty({ description: 'Khoảng cách (km)' })
    @Expose()
    distance: number;

    @ApiProperty({ description: 'Thời gian (phút)' })
    @Expose()
    time: number;

    @ApiProperty({ description: 'Chi phí (VND)' })
    @Expose()
    cost: number;
}
