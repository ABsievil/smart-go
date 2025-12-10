import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { RoutingService } from '@modules/routing/services/routing.service';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { MultiObjectiveRoutingRequestDto } from '@modules/routing/dtos/request/multi-objective-routing-request.dto';
import { MultiObjectiveRoutingResponseDto } from '@modules/routing/dtos/response/multi-objective-routing-response.dto';
import { RoutingCriteria } from '@modules/routing/enums/routing.enum';

@ApiTags('Routing')
@Controller('routing')
export class RoutingController {
    constructor(
        private readonly routingService: RoutingService,
        private readonly pinoLogger: PinoLogger,
    ) {
        this.pinoLogger.setContext(RoutingController.name);
    }

    @Post('find-paths-multi-objective')
    @LanguageResponse({
        module: 'routing',
        successKey: 'findPathsMultiObjective',
    })
    @ApiOperation({
        summary: 'Tìm nhiều lộ trình tối ưu Pareto (Multi-Objective A* - MOA*)',
        description: `
Sử dụng Multi-Objective A* (MOA*) để tìm 3-5 lộ trình tối ưu Pareto với trade-offs khác nhau giữa thời gian, chi phí và khoảng cách.

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
        type: MultiObjectiveRoutingResponseDto,
    })
    @HttpCode(HttpStatus.OK)
    async findPathsMultiObjective(
        @Body() request: MultiObjectiveRoutingRequestDto,
    ): Promise<MultiObjectiveRoutingResponseDto> {
        const {
            fromStationCode,
            toStationCode,
            criteria = RoutingCriteria.TIME,
            numPaths = 3,
            maxTransfers,
            timeOfDay,
            congestionAware = true,
        } = request;

        // Map RoutingCriteria thành trọng số
        const weights = this.mapCriteriaToWeights(criteria);

        this.pinoLogger.info(
            `Finding ${numPaths} Pareto-optimal paths from ${fromStationCode} to ${toStationCode} ` +
                `with criteria ${criteria} [time=${weights.timeWeight}, cost=${weights.costWeight}, distance=${weights.distanceWeight}], ` +
                `congestionAware=${congestionAware}, timeOfDay=${timeOfDay ?? 'current'}`,
        );

        return await this.routingService.findPathsMultiObjective(
            fromStationCode,
            toStationCode,
            weights,
            numPaths,
            maxTransfers,
            timeOfDay,
            congestionAware,
        );
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
                return {
                    timeWeight: 1.0,
                    costWeight: 0.0,
                    distanceWeight: 0.0,
                };
            case RoutingCriteria.COST:
                return {
                    timeWeight: 0.0,
                    costWeight: 1.0,
                    distanceWeight: 0.0,
                };
            case RoutingCriteria.DISTANCE:
                return {
                    timeWeight: 0.0,
                    costWeight: 0.0,
                    distanceWeight: 1.0,
                };
            case RoutingCriteria.BALANCED:
                return {
                    timeWeight: 0.5,
                    costWeight: 0.3,
                    distanceWeight: 0.2,
                };
            default:
                return {
                    timeWeight: 1.0,
                    costWeight: 0.0,
                    distanceWeight: 0.0,
                };
        }
    }
}
