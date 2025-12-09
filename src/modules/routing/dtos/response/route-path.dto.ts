import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { StationInfoDto } from './station-info.dto';
import { RouteInfoDto } from './route-info.dto';
import { SegmentDto } from './segment.dto';

export class RoutePathDto {
    @ApiProperty({ description: 'Danh sách trạm', type: [StationInfoDto] })
    @Expose()
    stations: StationInfoDto[];

    @ApiProperty({ description: 'Danh sách tuyến', type: [RouteInfoDto] })
    @Expose()
    routes: RouteInfoDto[];

    @ApiProperty({ description: 'Tổng khoảng cách (km)' })
    @Expose()
    totalDistance: number;

    @ApiProperty({ description: 'Tổng thời gian (phút)' })
    @Expose()
    totalTime: number;

    @ApiProperty({ description: 'Tổng chi phí (VND)' })
    @Expose()
    totalCost: number;

    @ApiProperty({ description: 'Các đoạn đường', type: [SegmentDto] })
    @Expose()
    segments: SegmentDto[];
}
