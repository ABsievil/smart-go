import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { RouteService } from '@modules/routes/services/route.service';
import { StationService } from '@modules/stations/services/station.service';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { RouteCreateRequestDto } from '@modules/routes/dtos/request/route-create.request.dto';
import { RouteUpdateRequestDto } from '@modules/routes/dtos/request/route-update.request.dto';
import { RouteGetResponseDto } from '@modules/routes/dtos/response/route-get.response.dto';
import { RouteListResponseDto } from '@modules/routes/dtos/response/route-list.response.dto';

type RouteDirection = 'forward' | 'backward' | 'both';

@ApiTags('Routes')
@Controller('routes')
export class RouteController {
    constructor(
        private readonly routeService: RouteService,
        private readonly stationService: StationService,
        private readonly pinoLogger: PinoLogger,
    ) {
        this.pinoLogger.setContext(RouteController.name);
    }

    /**
     * @description Extract station codes from route codes (Map or object)
     */
    private processStationCodes(codes: any, stationCodeSet: Set<string>): void {
        if (!codes) return;

        if (codes instanceof Map) {
            for (const key of codes.keys()) {
                stationCodeSet.add(String(key));
            }
        } else if (typeof codes === 'object') {
            for (const key of Object.keys(codes)) {
                stationCodeSet.add(String(key));
            }
        }
    }

    /**
     * @description Extract station codes from route based on direction
     */
    private extractStationCodesFromRoute(
        route: any,
        direction: RouteDirection,
        stationCodeSet: Set<string>,
    ): void {
        const routeForwardCodes = route?.routeForwardCodes;
        const routeBackwardCodes = route?.routeBackwardCodes;

        if (direction === 'forward' || direction === 'both') {
            this.processStationCodes(routeForwardCodes, stationCodeSet);
        }

        if (direction === 'backward' || direction === 'both') {
            this.processStationCodes(routeBackwardCodes, stationCodeSet);
        }
    }

    @Get()
    @LanguageResponse({
        module: 'routes',
        successKey: 'findAll',
    })
    @ApiOperation({ summary: 'Get all routes' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'direction',
        required: false,
        enum: ['forward', 'backward', 'both'],
        example: 'both',
        description:
            'Direction to get station codes: forward (lượt đi), backward (lượt về), or both',
    })
    @ApiResponse({
        status: 200,
        description: 'List of routes',
        type: RouteListResponseDto,
    })
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('direction', new DefaultValuePipe('both'))
        direction: RouteDirection,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        const { page: _, limit: __, direction: ___, ...filter } = query;
        const { data, total } = await this.routeService.findAll(
            filter,
            page,
            limit,
        );

        // Lấy danh sách stationCode từ routeForwardCodes hoặc routeBackwardCodes dựa trên direction
        const stationCodeSet = new Set<string>();
        for (const route of data) {
            this.extractStationCodesFromRoute(route, direction, stationCodeSet);
        }

        const allStationCodes = Array.from(stationCodeSet);
        const stations = await this.stationService.findByCodes(allStationCodes);

        return {
            total,
            page,
            limit,
            routes: this.routeService.mapList(data),
            stations: this.stationService.mapList(stations),
        };
    }

    @Get(':id')
    @LanguageResponse({
        module: 'routes',
        successKey: 'findOne',
    })
    @ApiOperation({ summary: 'Get route by ID' })
    @ApiQuery({
        name: 'direction',
        required: false,
        enum: ['forward', 'backward', 'both'],
        example: 'both',
        description:
            'Direction to get station codes: forward (lượt đi), backward (lượt về), or both',
    })
    @ApiResponse({
        status: 200,
        description: 'Route found',
        type: RouteGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Route not found' })
    async findOne(
        @Param('id') id: string,
        @Query('direction', new DefaultValuePipe('both'))
        direction: RouteDirection,
    ): Promise<any> {
        const route = await this.routeService.findOne(id);

        // Lấy danh sách stationCode từ routeForwardCodes hoặc routeBackwardCodes dựa trên direction
        const stationCodeSet = new Set<string>();
        this.extractStationCodesFromRoute(route, direction, stationCodeSet);

        const allStationCodes = Array.from(stationCodeSet);
        const stations = await this.stationService.findByCodes(allStationCodes);

        return {
            route: this.routeService.mapGet(route),
            stations: this.stationService.mapList(stations),
        };
    }

    // @Post()
    // @LanguageResponse({
    //     module: 'routes',
    //     successKey: 'create',
    // })
    // @ApiOperation({ summary: 'Create a new route' })
    // @ApiResponse({
    //     status: 201,
    //     description: 'Route created successfully',
    //     type: RouteGetResponseDto,
    // })
    // @HttpCode(HttpStatus.CREATED)
    // async create(
    //     @Body() createDto: RouteCreateRequestDto,
    // ): Promise<RouteGetResponseDto> {
    //     const route = await this.routeService.create(createDto);
    //     return this.routeService.mapGet(route);
    // }

    // @Put(':id')
    // @LanguageResponse({
    //     module: 'routes',
    //     successKey: 'update',
    // })
    // @ApiOperation({ summary: 'Update route by ID' })
    // @ApiResponse({
    //     status: 200,
    //     description: 'Route updated successfully',
    //     type: RouteGetResponseDto,
    // })
    // @ApiResponse({ status: 404, description: 'Route not found' })
    // async update(
    //     @Param('id') id: string,
    //     @Body() updateDto: RouteUpdateRequestDto,
    // ): Promise<RouteGetResponseDto> {
    //     const route = await this.routeService.update(id, updateDto);
    //     return this.routeService.mapGet(route);
    // }

    // @Delete(':id')
    // @LanguageResponse({
    //     module: 'routes',
    //     successKey: 'remove',
    // })
    // @ApiOperation({ summary: 'Delete route by ID' })
    // @ApiResponse({ status: 200, description: 'Route deleted successfully' })
    // @ApiResponse({ status: 404, description: 'Route not found' })
    // @HttpCode(HttpStatus.OK)
    // async remove(@Param('id') id: string): Promise<void> {
    //     return this.routeService.remove(id);
    // }
}
