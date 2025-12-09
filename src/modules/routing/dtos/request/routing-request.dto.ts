import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsInt,
    Min,
} from 'class-validator';
import {
    RoutingAlgorithm,
    RoutingCriteria,
} from '@modules/routing/enums/routing.enum';

export class RoutingRequestDto {
    @ApiProperty({
        description: 'Mã trạm xuất phát',
        example: 'ST001',
    })
    @IsString()
    @IsNotEmpty()
    fromStationCode: string;

    @ApiProperty({
        description: 'Mã trạm đích',
        example: 'ST002',
    })
    @IsString()
    @IsNotEmpty()
    toStationCode: string;

    @ApiProperty({
        description: 'Thuật toán sử dụng (astar hoặc dijkstra)',
        enum: RoutingAlgorithm,
        default: RoutingAlgorithm.ASTAR,
        required: false,
    })
    @IsEnum(RoutingAlgorithm)
    @IsOptional()
    algorithm?: RoutingAlgorithm = RoutingAlgorithm.ASTAR;

    @ApiProperty({
        description: 'Tiêu chí tối ưu (distance, time, hoặc cost)',
        enum: RoutingCriteria,
        default: RoutingCriteria.DISTANCE,
        required: false,
    })
    @IsEnum(RoutingCriteria)
    @IsOptional()
    criteria?: RoutingCriteria = RoutingCriteria.DISTANCE;

    @ApiProperty({
        description: 'Số lần chuyển tuyến tối đa cho phép',
        example: 2,
        default: undefined,
        required: false,
        minimum: 0,
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    maxTransfers?: number;
}
