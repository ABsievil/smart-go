import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { RoutingService } from '@modules/routing/services/routing.service';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { RoutingRequestDto } from '@modules/routing/dtos/request/routing-request.dto';
import { RoutingResponseDto } from '@modules/routing/dtos/response/routing-response.dto';
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

    @Post('find-path')
    @LanguageResponse({
        module: 'routing',
        successKey: 'findPath',
    })
    @ApiOperation({
        summary: 'Tìm đường đi tối ưu giữa hai trạm (Single-Objective)',
        description:
            'Sử dụng thuật toán A* (với fallback sang Dijkstra) để tìm đường đi tối ưu dựa trên một tiêu chí duy nhất: khoảng cách, thời gian hoặc chi phí. A* tự động fallback sang Dijkstra nếu không tìm thấy. Theo báo cáo nghiên cứu, A* giảm 20-40% số nodes khám phá và nhanh hơn 2-5 lần so với Dijkstra.',
    })
    @ApiResponse({
        status: 200,
        description: 'Tìm thấy đường đi tối ưu',
        type: RoutingResponseDto,
    })
    @HttpCode(HttpStatus.OK)
    async findPath(
        @Body() request: RoutingRequestDto,
    ): Promise<RoutingResponseDto> {
        const {
            fromStationCode,
            toStationCode,
            criteria = RoutingCriteria.DISTANCE,
            maxTransfers,
        } = request;

        this.pinoLogger.info(
            `Finding path from ${fromStationCode} to ${toStationCode} with criteria ${criteria} and maxTransfers=${maxTransfers}`,
        );

        // Sử dụng A* với fallback sang Dijkstra
        const path = await this.routingService.findPathWithFallback(
            fromStationCode,
            toStationCode,
            criteria,
            true, // prefer A*
            maxTransfers,
        );

        return this.routingService.mapGet(path);
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
- Hỗ trợ trọng số tùy chỉnh: h(n) = w1×time + w2×cost + w3×distance
- Tích hợp dữ liệu tắc nghẽn giờ cao điểm (+20% thời gian theo báo cáo)
- Trả về 3-5 lựa chọn tối ưu Pareto (fastest, cheapest, shortest, balanced)
- Chi phí tính toán thêm 20-30% nhưng cung cấp nhiều lựa chọn

**Ví dụ trọng số:**
- Nhanh nhất: timeWeight=1.0, costWeight=0, distanceWeight=0
- Rẻ nhất: timeWeight=0, costWeight=1.0, distanceWeight=0
- Ngắn nhất: timeWeight=0, costWeight=0, distanceWeight=1.0
- Cân bằng: timeWeight=0.5, costWeight=0.3, distanceWeight=0.2
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
            timeWeight = 1.0,
            costWeight = 0.0,
            distanceWeight = 0.0,
            numPaths = 3,
            maxTransfers,
            timeOfDay,
            congestionAware = true,
        } = request;

        this.pinoLogger.info(
            `Finding ${numPaths} Pareto-optimal paths from ${fromStationCode} to ${toStationCode} ` +
                `with weights [time=${timeWeight}, cost=${costWeight}, distance=${distanceWeight}], ` +
                `congestionAware=${congestionAware}, timeOfDay=${timeOfDay ?? 'current'}`,
        );

        return await this.routingService.findPathsMultiObjective(
            fromStationCode,
            toStationCode,
            {
                timeWeight,
                costWeight,
                distanceWeight,
            },
            numPaths,
            maxTransfers,
            timeOfDay,
            congestionAware,
        );
    }
}
