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

    @ApiProperty({ description: 'Status', enum: RouteStatus })
    @Expose()
    status: RouteStatus;

    @ApiPropertyOptional({ description: 'Operator name' })
    @Expose()
    operatorName?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @Expose()
    phoneNumber?: string;

    @ApiPropertyOptional({ description: 'Vehicle type' })
    @Expose()
    vehicleType?: string;

    @ApiPropertyOptional({ description: 'Start point' })
    @Expose()
    startPoint?: string;

    @ApiPropertyOptional({ description: 'End point' })
    @Expose()
    endPoint?: string;

    @ApiPropertyOptional({ description: 'Frequency' })
    @Expose()
    frequency?: string;

    @ApiPropertyOptional({
        description: 'Base fare',
        type: [String],
    })
    @Expose()
    baseFare?: string[];

    @ApiPropertyOptional({ description: 'Total distance in km' })
    @Expose()
    totalDistance?: number;

    @ApiPropertyOptional({ description: 'Is wheelchair accessible' })
    @Expose()
    isWheelchairAccessible?: boolean;

    @ApiPropertyOptional({ description: 'Operating time' })
    @Expose()
    operatingTime?: OperatingTimeResponseDto;

    @ApiPropertyOptional({ description: 'Trip time' })
    @Expose()
    tripTime?: string;

    @ApiPropertyOptional({ description: 'Number of trips' })
    @Expose()
    numTrips?: string;

    @ApiPropertyOptional({
        description: 'Route forward station codes map',
        type: 'object',
        additionalProperties: { type: 'string' },
    })
    @Expose()
    routeForwardCodes?: Record<string, string>;

    @ApiPropertyOptional({
        description: 'Route backward station codes map',
        type: 'object',
        additionalProperties: { type: 'string' },
    })
    @Expose()
    routeBackwardCodes?: Record<string, string>;
}
