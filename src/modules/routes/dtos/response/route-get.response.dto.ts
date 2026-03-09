import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { TransportType, RouteStatus } from '@modules/routes/enums/route.enum';

export class RouteGetResponseDto extends BaseResponseDto {
    @ApiPropertyOptional({ description: 'Route key' })
    @Expose()
    routeKey?: string;

    @ApiProperty({ description: 'Route code' })
    @Expose()
    routeCode: string;

    @ApiProperty({ description: 'Route name', type: String })
    @Expose()
    routeName: string;

    @ApiPropertyOptional({ description: 'Route variant short name' })
    @Expose()
    routeVarShortName?: string;

    @ApiPropertyOptional({ description: 'Start point' })
    @Expose()
    startPoint?: string;

    @ApiPropertyOptional({ description: 'End point' })
    @Expose()
    endPoint?: string;

    @ApiPropertyOptional({ description: 'Is outbound direction (lượt đi)' })
    @Expose()
    isOutbound?: boolean;

    @ApiPropertyOptional({ description: 'Running time' })
    @Expose()
    runningTime?: string;

    @ApiPropertyOptional({ description: 'Operator name' })
    @Expose()
    operatorName?: string;

    @ApiProperty({ description: 'Transport type', enum: TransportType })
    @Expose()
    transportType: TransportType;

    @ApiPropertyOptional({ description: 'Total distance in km' })
    @Expose()
    totalDistance?: number;

    @ApiPropertyOptional({ description: 'Vehicle type' })
    @Expose()
    vehicleType?: string;

    @ApiPropertyOptional({ description: 'Operating time start' })
    @Expose()
    operatingTimeStart?: string;

    @ApiPropertyOptional({ description: 'Operating time end' })
    @Expose()
    operatingTimeEnd?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @Expose()
    phoneNumber?: string;

    @ApiPropertyOptional({ description: 'Base fare list', type: [String] })
    @Expose()
    baseFare?: string[];

    @ApiPropertyOptional({ description: 'Number of trips' })
    @Expose()
    numTrips?: string;

    @ApiPropertyOptional({ description: 'Trip time' })
    @Expose()
    tripTime?: string;

    @ApiPropertyOptional({ description: 'Frequency between trips' })
    @Expose()
    frequency?: string;

    @ApiProperty({ description: 'Status', enum: RouteStatus })
    @Expose()
    status: RouteStatus;

    @ApiPropertyOptional({
        description: 'List of station IDs/codes on this route',
        type: [String],
    })
    @Expose()
    stationIds?: string[];
}
