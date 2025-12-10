import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { RoutingService } from '@modules/routing/services/routing.service';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { RoutingRequestDto } from '@modules/routing/dtos/request/routing.request.dto';
import { RoutingResponseDto } from '@modules/routing/dtos/response/routing.response.dto';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';
import {
    WEIGHT_CONFIG_FASTEST,
    WEIGHT_CONFIG_CHEAPEST,
    WEIGHT_CONFIG_SHORTEST,
    WEIGHT_CONFIG_BALANCED,
} from '@modules/routing/constants/routing.constants';

@ApiTags('Routing')
@Controller('routing')
export class RoutingController {
    constructor(
        private readonly routingService: RoutingService,
        private readonly logger: Logger,
    ) {}
    @Post('find-path')
    @LanguageResponse({
        module: 'routing',
        successKey: 'findPath',
    })
    @ApiOperation({
        summary: 'Tìm nhiều lộ trình tối ưu Pareto (Multi-Objective A* - MOA*)',
        description: `
Sử dụng Multi-Objective A* (MOA*) để tìm 3-5 lộ trình tối ưu Pareto với trade-offs khác nhau giữa thời gian, chi phí và khoảng cách.

**Hỗ trợ 2 cách tìm kiếm:**
1. **Theo mã trạm**: Cung cấp stationCode.from và stationCode.to
2. **Theo tọa độ**: Cung cấp coordinates.from và coordinates.to (tự động tìm trạm gần nhất)
3. **Mix**: Có thể mix stationCode.from với coordinates.to hoặc ngược lại

**Cải tiến theo báo cáo nghiên cứu:**
- Sử dụng RoutingCriteria để tự động map trọng số: h(n) = w1×time + w2×cost + w3×distance
- Tích hợp dữ liệu tắc nghẽn giờ cao điểm (+20% thời gian theo báo cáo)
- Trả về 3-5 lựa chọn tối ưu Pareto (fastest, cheapest, shortest, balanced)
- Chi phí tính toán thêm 20-30% nhưng cung cấp nhiều lựa chọn

**Các tiêu chí:**
- TIME: ưu tiên thời gian (timeWeight=1.0, costWeight=0.0, distanceWeight=0.0)
- COST: ưu tiên chi phí (timeWeight=0.0, costWeight=1.0, distanceWeight=0.0)
- DISTANCE: ưu tiên khoảng cách (timeWeight=0.0, costWeight=0.0, distanceWeight=1.0)
- BALANCED: cân bằng (timeWeight=0.5, costWeight=0.3, distanceWeight=0.2)
        `,
    })
    @ApiResponse({
        status: 200,
        description: 'Tìm thấy các lộ trình tối ưu Pareto',
        type: RoutingResponseDto,
    })
    @HttpCode(HttpStatus.OK)
    async findPaths(
        @Body() request: RoutingRequestDto,
    ): Promise<RoutingResponseDto> {
        const {
            stationCode,
            coordinates,
            criteria = RoutingCriteria.TIME,
            numPaths = 3,
            maxTransfers,
            timeOfDay,
            congestionAware = true,
        } = request;

        // Validate: phải có ít nhất stationCode hoặc coordinates
        if (!stationCode && !coordinates) {
            throw new BadRequestException(
                'Either stationCode or coordinates must be provided',
            );
        }

        // Validate from
        if (!stationCode?.from && !coordinates?.from) {
            throw new BadRequestException(
                'Either stationCode.from or coordinates.from must be provided',
            );
        }

        // Validate to
        if (!stationCode?.to && !coordinates?.to) {
            throw new BadRequestException(
                'Either stationCode.to or coordinates.to must be provided',
            );
        }

        const weights = this.mapCriteriaToWeights(criteria);

        // Tối ưu: Xử lý song song việc tìm nearest station cho FROM và TO
        const findFromStationPromise = stationCode?.from
            ? Promise.resolve(stationCode.from)
            : coordinates?.from
              ? this.routingService
                    .findNearestStation(
                        coordinates.from.latitude,
                        coordinates.from.longitude,
                    )
                    .then((station) => {
                        if (!station) {
                            throw new BadRequestException(
                                `No station found near coordinates.from (${coordinates.from.latitude}, ${coordinates.from.longitude})`,
                            );
                        }
                        return station;
                    })
              : Promise.reject(
                    new BadRequestException(
                        'Either stationCode.from or coordinates.from must be provided',
                    ),
                );

        const findToStationPromise = stationCode?.to
            ? Promise.resolve(stationCode.to)
            : coordinates?.to
              ? this.routingService
                    .findNearestStation(
                        coordinates.to.latitude,
                        coordinates.to.longitude,
                    )
                    .then((station) => {
                        if (!station) {
                            throw new BadRequestException(
                                `No station found near coordinates.to (${coordinates.to.latitude}, ${coordinates.to.longitude})`,
                            );
                        }
                        return station;
                    })
              : Promise.reject(
                    new BadRequestException(
                        'Either stationCode.to or coordinates.to must be provided',
                    ),
                );

        const [finalFromStationCode, finalToStationCode] = await Promise.all([
            findFromStationPromise,
            findToStationPromise,
        ]);

        this.logger.debug(
            `Station codes resolved: from=${finalFromStationCode}, to=${finalToStationCode}`,
        );

        const routingData = await this.routingService.findPaths(
            finalFromStationCode,
            finalToStationCode,
            weights,
            numPaths,
            maxTransfers,
            timeOfDay,
            congestionAware,
        );

        return this.routingService.mapGet(routingData);
    }

    /**
     * @description Map RoutingCriteria enum thành trọng số cho Multi-Objective A*
     */
    private mapCriteriaToWeights(criteria: RoutingCriteria): {
        timeWeight: number;
        costWeight: number;
        distanceWeight: number;
    } {
        switch (criteria) {
            case RoutingCriteria.TIME:
                return WEIGHT_CONFIG_FASTEST;
            case RoutingCriteria.COST:
                return WEIGHT_CONFIG_CHEAPEST;
            case RoutingCriteria.DISTANCE:
                return WEIGHT_CONFIG_SHORTEST;
            case RoutingCriteria.BALANCED:
                return WEIGHT_CONFIG_BALANCED;
            default:
                return WEIGHT_CONFIG_FASTEST;
        }
    }
}
