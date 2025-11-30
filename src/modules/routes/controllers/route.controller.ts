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
        private readonly pinoLogger: PinoLogger,
    ) {
        this.pinoLogger.setContext(RouteController.name);
    }

    @Post()
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
        this.pinoLogger.info(
            { action: 'create', data: createDto },
            'Creating route',
        );
        const route = await this.routeService.create(createDto);
        return this.routeService.mapGet(route);
    }

    @Get()
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
    ): Promise<RouteListResponseDto> {
        const { page: _, limit: __, ...filter } = query;
        this.pinoLogger.info(
            { action: 'findAll', page, limit, filter },
            'Fetching routes',
        );
        const { data, total } = await this.routeService.findAll(
            filter,
            page,
            limit,
        );
        return {
            data: this.routeService.mapList(data),
            total,
            page,
            limit,
        };
    }

    @Get(':id')
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
    async findOne(@Param('id') id: string): Promise<RouteGetResponseDto> {
        this.pinoLogger.info({ action: 'findOne', id }, 'Fetching route by ID');
        const route = await this.routeService.findOne(id);
        return this.routeService.mapGet(route);
    }

    @Put(':id')
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
        this.pinoLogger.info(
            { action: 'update', id, data: updateDto },
            'Updating route',
        );
        const route = await this.routeService.update(id, updateDto);
        return this.routeService.mapGet(route);
    }

    @Delete(':id')
    @LanguageResponse({
        module: 'routes',
        successKey: 'remove',
    })
    @ApiOperation({ summary: 'Delete route by ID' })
    @ApiResponse({ status: 200, description: 'Route deleted successfully' })
    @ApiResponse({ status: 404, description: 'Route not found' })
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string): Promise<void> {
        this.pinoLogger.info({ action: 'remove', id }, 'Deleting route');
        return this.routeService.remove(id);
    }
}
