import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class StationInfoDto {
    @ApiProperty({ description: 'Mã trạm' })
    @Expose()
    stationCode: string;

    @ApiProperty({ description: 'Tên trạm' })
    @Expose()
    stationName: string;

    @ApiProperty({ description: 'Tọa độ', required: false })
    @Expose()
    coordinates?: {
        latitude?: number;
        longitude?: number;
    };
}
