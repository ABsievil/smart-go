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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { RouteService } from '@modules/routes/services/route.service';
import { StationService } from '@modules/stations/services/station.service';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { RouteCreateRequestDto } from '@modules/routes/dtos/request/route-create.request.dto';
import { RouteUpdateRequestDto } from '@modules/routes/dtos/request/route-update.request.dto';
import { RouteGetResponseDto } from '@modules/routes/dtos/response/route-get.response.dto';
import { RouteListResponseDto } from '@modules/routes/dtos/response/route-list.response.dto';

@ApiTags('Routes')
@Controller('routes')
export class RouteController {
    constructor(
        private readonly routeService: RouteService,
        private readonly stationService: StationService,
    ) {}

    @Get()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'routes',
        successKey: 'findAll',
    })
    @ApiOperation({ summary: 'Get all routes' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'List of routes',
        type: RouteListResponseDto,
    })
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query() query: Record<string, any>,
    ): Promise<any> {
        const { page: _, limit: __, ...filter } = query;
        const { data, total } = await this.routeService.findAll(
            filter,
            page,
            limit,
        );

        const allStationIds = Array.from(
            new Set(data.flatMap((route) => route.stationIds ?? [])),
        );
        const { data: stations } = await this.stationService.findAll({
            _id: { $in: allStationIds },
        });

        return {
            total,
            page,
            limit,
            routes: this.routeService.mapList(data),
            stations: this.stationService.mapList(stations),
        };
    }

    @Get(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'routes',
        successKey: 'findOne',
    })
    @ApiOperation({ summary: 'Get route by ID' })
    @ApiResponse({
        status: 200,
        description: 'Route found',
        type: RouteGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Route not found' })
    async findOne(@Param('id') id: string): Promise<any> {
        const route = await this.routeService.findOne(id);

        const stationIds = route.stationIds ?? [];
        const { data: stations } = await this.stationService.findAll({
            _id: { $in: stationIds },
        });

        return {
            route: this.routeService.mapGet(route),
            stations: this.stationService.mapList(stations),
        };
    }

    @Post()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'routes',
        successKey: 'create',
    })
    @ApiOperation({ summary: 'Create a new route' })
    @ApiResponse({
        status: 201,
        description: 'Route created successfully',
        type: RouteGetResponseDto,
    })
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() createDto: RouteCreateRequestDto,
    ): Promise<RouteGetResponseDto> {
        const route = await this.routeService.create(createDto);
        return this.routeService.mapGet(route);
    }

    @Put(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'routes',
        successKey: 'update',
    })
    @ApiOperation({ summary: 'Update route by ID' })
    @ApiResponse({
        status: 200,
        description: 'Route updated successfully',
        type: RouteGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Route not found' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: RouteUpdateRequestDto,
    ): Promise<RouteGetResponseDto> {
        const route = await this.routeService.update(id, updateDto);
        return this.routeService.mapGet(route);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'routes',
        successKey: 'remove',
    })
    @ApiOperation({ summary: 'Delete route by ID' })
    @ApiResponse({ status: 200, description: 'Route deleted successfully' })
    @ApiResponse({ status: 404, description: 'Route not found' })
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string): Promise<void> {
        return this.routeService.delete(id);
    }
}
