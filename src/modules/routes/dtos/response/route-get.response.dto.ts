import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { TransportType, RouteStatus } from '@modules/routes/enums/route.enum';

class OperatingTimeResponseDto {
    @ApiPropertyOptional({ description: 'Operating time from' })
    @Expose()
    from?: string;

    @ApiPropertyOptional({ description: 'Operating time to' })
    @Expose()
    to?: string;
}

class FrequencyRangeResponseDto {
    @ApiPropertyOptional({ description: 'Frequency from (minutes)' })
    @Expose()
    from?: number;

    @ApiPropertyOptional({ description: 'Frequency to (minutes)' })
    @Expose()
    to?: number;
}

export class RouteGetResponseDto extends BaseResponseDto {
    @ApiProperty({ description: 'Route code' })
    @Expose()
    routeCode: string;

    @ApiProperty({ description: 'Route name', type: String })
    @Expose()
    routeName: string;

    @ApiProperty({ description: 'Transport type', enum: TransportType })
    @Expose()
    transportType: TransportType;

    @ApiProperty({ description: 'Start point' })
    @Expose()
    startPoint: string;

    @ApiProperty({ description: 'End point' })
    @Expose()
    endPoint: string;

    @ApiProperty({ description: 'Frequency in minutes' })
    @Expose()
    frequency: number;

    @ApiProperty({ description: 'Base fare' })
    @Expose()
    baseFare: number;

    @ApiProperty({ description: 'Total distance in km' })
    @Expose()
    totalDistance: number;

    @ApiPropertyOptional({ description: 'Distance' })
    @Expose()
    distance?: number;

    @ApiProperty({ description: 'Is wheelchair accessible' })
    @Expose()
    isWheelchairAccessible: boolean;

    @ApiProperty({ description: 'Status', enum: RouteStatus })
    @Expose()
    status: RouteStatus;

    @ApiPropertyOptional({ description: 'Operating time' })
    @Expose()
    operatingTime?: OperatingTimeResponseDto;

    @ApiPropertyOptional({ description: 'Trip time in minutes' })
    @Expose()
    tripTime?: number;

    @ApiPropertyOptional({
        description: 'Frequency of each trip (minutes range)',
        type: FrequencyRangeResponseDto,
    })
    @Expose()
    frequencyOfEachTrip?: FrequencyRangeResponseDto;

    @ApiPropertyOptional({
        description: 'Station IDs map',
        type: 'object',
        additionalProperties: { type: 'string' },
    })
    @Expose()
    stationIds?: Record<string, string>;

    @ApiPropertyOptional({ description: 'Operator name' })
    @Expose()
    operatorName?: string;

    @ApiPropertyOptional({
        description: 'Payment methods',
        type: [String],
        example: ['Tiền mặt', 'Thẻ ngân hàng'],
    })
    @Expose()
    paymentMethods?: string[];

    @ApiPropertyOptional({ description: 'Additional note' })
    @Expose()
    note?: string;
}
