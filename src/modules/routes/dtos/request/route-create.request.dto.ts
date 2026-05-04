import {
    IsString,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    TransportType,
    RouteStatus,
    RouteType,
} from '@modules/routes/enums/route.enum';

export class RouteCreateRequestDto {
    @ApiPropertyOptional({ description: 'Route key' })
    @IsOptional()
    @IsString()
    routeKey?: string;

    @ApiProperty({ description: 'Route code', example: 'R001' })
    @IsString()
    routeCode: string;

    @ApiProperty({ description: 'Route name', example: 'Route 1 - Tuyến 1' })
    @IsString()
    routeName: string;

    @ApiPropertyOptional({
        description: 'Route variant short name',
        example: 'Tuyến 1',
    })
    @IsOptional()
    @IsString()
    routeVarShortName?: string;

    @ApiPropertyOptional({ description: 'Start point' })
    @IsOptional()
    @IsString()
    startPoint?: string;

    @ApiPropertyOptional({ description: 'End point' })
    @IsOptional()
    @IsString()
    endPoint?: string;

    @ApiPropertyOptional({
        description: 'Is outbound direction (lượt đi)',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    isOutbound?: boolean;

    @ApiPropertyOptional({ description: 'Running time', example: '35 phút' })
    @IsOptional()
    @IsString()
    runningTime?: string;

    @ApiPropertyOptional({ description: 'Operator name' })
    @IsOptional()
    @IsString()
    operatorName?: string;

    @ApiProperty({ description: 'Transport type', enum: TransportType })
    @IsEnum(TransportType)
    transportType: TransportType;

    @ApiPropertyOptional({
        description: 'Route mode (bus / metro / waterbus)',
        enum: RouteType,
        default: RouteType.BUS,
    })
    @IsOptional()
    @IsEnum(RouteType)
    routeType?: RouteType;

    @ApiPropertyOptional({ description: 'Total distance in km', example: 8.59 })
    @IsOptional()
    @IsNumber()
    totalDistance?: number;

    @ApiPropertyOptional({ description: 'Vehicle type', example: '50 chỗ' })
    @IsOptional()
    @IsString()
    vehicleType?: string;

    @ApiPropertyOptional({
        description: 'Operating time start',
        example: '05:00',
    })
    @IsOptional()
    @IsString()
    operatingTimeStart?: string;

    @ApiPropertyOptional({
        description: 'Operating time end',
        example: '21:30',
    })
    @IsOptional()
    @IsString()
    operatingTimeEnd?: string;

    @ApiPropertyOptional({
        description: 'Phone number',
        example: '028.3776.3777',
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({
        description: 'Base fare list',
        type: [String],
        example: [
            'Vé lượt trợ giá: 5,000 VNĐ',
            'Vé lượt trợ giá HSSV: 3,000 VNĐ',
        ],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    baseFare?: string[];

    @ApiPropertyOptional({
        description: 'Number of trips',
        example: '120 chuyến/ngày',
    })
    @IsOptional()
    @IsString()
    numTrips?: string;

    @ApiPropertyOptional({ description: 'Trip time', example: '35 phút' })
    @IsOptional()
    @IsString()
    tripTime?: string;

    @ApiPropertyOptional({
        description: 'Frequency between trips',
        example: '15 - 18 phút',
    })
    @IsOptional()
    @IsString()
    frequency?: string;

    @ApiPropertyOptional({
        description: 'Status',
        enum: RouteStatus,
        default: RouteStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(RouteStatus)
    status?: RouteStatus;

    @ApiPropertyOptional({
        description: 'List of station IDs/codes on this route',
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    stationIds?: string[];
}
