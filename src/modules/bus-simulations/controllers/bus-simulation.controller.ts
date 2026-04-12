import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    MessageEvent,
    NotFoundException,
    Param,
    Sse,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { BusSimulationService } from '@modules/bus-simulations/services/bus-simulation.service';
import { BusTripResponseDto } from '@modules/bus-simulations/dtos/response/bus-trip.response.dto';
import { BusPositionResponseDto } from '@modules/bus-simulations/dtos/response/bus-position.response.dto';
import { UpcomingBusAtStationResponseDto } from '@modules/bus-simulations/dtos/response/upcoming-bus-at-station.response.dto';
import { Public } from '@modules/auth/decorators/auth.decorator';

@ApiTags('Bus Simulations')
@Controller('bus-simulations')
export class BusSimulationController {
    constructor(private readonly busSimulationService: BusSimulationService) {}

    @Get('routes/:routeId/trips')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'bus-simulations',
        successKey: 'findTripSchedule',
    })
    @ApiOperation({
        summary: 'Lấy toàn bộ lịch chạy trong ngày của một tuyến xe',
        description:
            'Trả về danh sách tất cả các chuyến được sinh ra từ operatingTimeStart đến operatingTimeEnd ' +
            'theo tần suất frequency của tuyến. Bao gồm cả chuyến SCHEDULED, RUNNING và COMPLETED.',
    })
    @ApiParam({
        name: 'routeId',
        type: String,
        description: 'ID của tuyến xe (route._id)',
        example: 'ea15599f-3191-474b-8d32-9a0ae7a0f1d1',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách lịch chạy của tuyến xe trong ngày',
        type: [BusTripResponseDto],
    })
    @HttpCode(HttpStatus.OK)
    async getTripSchedule(
        @Param('routeId') routeId: string,
    ): Promise<BusTripResponseDto[]> {
        return this.busSimulationService
            .getTripSchedule(routeId)
            .map((trip) => this.busSimulationService.mapTripToDto(trip));
    }

    @Get('routes/:routeId/positions')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'bus-simulations',
        successKey: 'findActivePositions',
    })
    @ApiOperation({
        summary: 'Lấy vị trí hiện tại của tất cả xe đang chạy trên một tuyến',
        description:
            'Trả về snapshot vị trí tức thời (lat/lng nội suy giữa 2 trạm kề nhau) ' +
            'và ETA đến từng trạm của các chuyến đang trong cửa sổ hoạt động (±10 phút).',
    })
    @ApiParam({
        name: 'routeId',
        type: String,
        description: 'ID của tuyến xe (route._id)',
        example: 'ea15599f-3191-474b-8d32-9a0ae7a0f1d1',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách vị trí hiện tại của các xe đang chạy',
        type: [BusPositionResponseDto],
    })
    @HttpCode(HttpStatus.OK)
    async getActivePositions(
        @Param('routeId') routeId: string,
    ): Promise<BusPositionResponseDto[]> {
        return this.busSimulationService
            .getActiveBusPositions(routeId)
            .map((pos) => this.busSimulationService.mapPositionToDto(pos));
    }

    @Get('trips/:tripId/position')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'bus-simulations',
        successKey: 'findTripPosition',
    })
    @ApiOperation({
        summary: 'Lấy vị trí hiện tại của một chuyến xe theo tripId',
        description:
            'Trả về vị trí tức thời, trạng thái (SCHEDULED/RUNNING/COMPLETED), ' +
            'thời gian đã đi và còn lại, cùng ETA đến từng trạm trên chuyến xe đó.',
    })
    @ApiParam({
        name: 'tripId',
        type: String,
        description:
            'ID của chuyến xe (UUID được sinh khi khởi tạo simulation)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Vị trí hiện tại của chuyến xe',
        type: BusPositionResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy chuyến xe với tripId được cung cấp',
    })
    @HttpCode(HttpStatus.OK)
    async getTripPosition(
        @Param('tripId') tripId: string,
    ): Promise<BusPositionResponseDto> {
        const position = this.busSimulationService.getTripPosition(tripId);
        if (!position) throw new NotFoundException(`Trip ${tripId} not found`);
        return this.busSimulationService.mapPositionToDto(position);
    }

    @Get('stations/:stationId/eta')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'bus-simulations',
        successKey: 'findStationEta',
    })
    @ApiOperation({
        summary:
            'Lấy danh sách các chuyến xe sắp đến một trạm (trong 90 phút tới)',
        description:
            'Trả về các chuyến xe từ tất cả các tuyến sẽ dừng tại trạm trong vòng 90 phút tới, ' +
            'sắp xếp theo thời gian đến gần nhất trước.',
    })
    @ApiParam({
        name: 'stationId',
        type: String,
        description: 'ID của trạm xe buýt (station._id)',
        example: '013e7489-7eeb-4d52-9a12-56840ee51cd5',
    })
    @ApiResponse({
        status: 200,
        description:
            'Danh sách các chuyến xe sắp đến trạm, sắp xếp theo ETA tăng dần',
        type: [UpcomingBusAtStationResponseDto],
    })
    @HttpCode(HttpStatus.OK)
    async getStationEta(
        @Param('stationId') stationId: string,
    ): Promise<UpcomingBusAtStationResponseDto[]> {
        return this.busSimulationService.getUpcomingBusesAtStation(stationId);
    }

    @Sse('routes/:routeId/stream')
    @Public()
    @ApiProduces('text/event-stream')
    @ApiOperation({
        summary:
            'SSE — vị trí realtime của tất cả xe trên một tuyến (mỗi 5 giây)',
        description:
            'Kết nối Server-Sent Events liên tục. Server đẩy mảng BusPositionResponseDto mỗi 5 giây. ' +
            'Sử dụng: `const es = new EventSource("/api/v1/bus-simulations/routes/{routeId}/stream"); ' +
            'es.onmessage = (e) => console.log(JSON.parse(e.data));`',
    })
    @ApiParam({
        name: 'routeId',
        type: String,
        description: 'ID của tuyến xe (route._id)',
        example: 'ea15599f-3191-474b-8d32-9a0ae7a0f1d1',
    })
    @ApiResponse({
        status: 200,
        description:
            'SSE stream — mỗi event.data là mảng BusPositionResponseDto (JSON)',
        type: [BusPositionResponseDto],
    })
    streamRoutePositions(
        @Param('routeId') routeId: string,
    ): Observable<MessageEvent> {
        return this.busSimulationService.streamRoutePositions(routeId);
    }

    @Sse('trips/:tripId/stream')
    @Public()
    @ApiProduces('text/event-stream')
    @ApiOperation({
        summary: 'SSE — vị trí realtime của một chuyến xe cụ thể (mỗi 5 giây)',
        description:
            'Kết nối Server-Sent Events liên tục. Server đẩy BusPositionResponseDto mỗi 5 giây. ' +
            'Sử dụng: `const es = new EventSource("/api/v1/bus-simulations/trips/{tripId}/stream"); ' +
            'es.onmessage = (e) => console.log(JSON.parse(e.data));`',
    })
    @ApiParam({
        name: 'tripId',
        type: String,
        description:
            'ID của chuyến xe (UUID được sinh khi khởi tạo simulation)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description:
            'SSE stream — mỗi event.data là một BusPositionResponseDto (JSON)',
        type: BusPositionResponseDto,
    })
    streamTripPosition(
        @Param('tripId') tripId: string,
    ): Observable<MessageEvent> {
        return this.busSimulationService.streamTripPosition(tripId);
    }

    @Sse('stations/:stationId/eta/stream')
    @Public()
    @ApiProduces('text/event-stream')
    @ApiOperation({
        summary:
            'SSE — ETA realtime của các chuyến xe tại một trạm (mỗi 5 giây)',
        description:
            'Kết nối Server-Sent Events liên tục. Server đẩy danh sách UpcomingBusAtStationResponseDto mỗi 5 giây. ' +
            'Sử dụng: `const es = new EventSource("/api/v1/bus-simulations/stations/{stationId}/eta/stream"); ' +
            'es.onmessage = (e) => console.log(JSON.parse(e.data));`',
    })
    @ApiParam({
        name: 'stationId',
        type: String,
        description: 'ID của trạm xe buýt (station._id)',
        example: '013e7489-7eeb-4d52-9a12-56840ee51cd5',
    })
    @ApiResponse({
        status: 200,
        description:
            'SSE stream — mỗi event.data là mảng UpcomingBusAtStationResponseDto (JSON)',
        type: [UpcomingBusAtStationResponseDto],
    })
    streamStationEtas(
        @Param('stationId') stationId: string,
    ): Observable<MessageEvent> {
        return this.busSimulationService.streamStationEtas(stationId);
    }
}
