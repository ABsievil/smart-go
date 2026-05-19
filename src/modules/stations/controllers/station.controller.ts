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
import { StationService } from '@modules/stations/services/station.service';
import { Encryption } from '@common/encryption/decorators/encryption.decorator';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { StationCreateRequestDto } from '@modules/stations/dtos/request/station-create.request.dto';
import { StationUpdateRequestDto } from '@modules/stations/dtos/request/station-update.request.dto';
import { StationGetResponseDto } from '@modules/stations/dtos/response/station-get.response.dto';
import { StationListResponseDto } from '@modules/stations/dtos/response/station-list.response.dto';
import { OrderDirection } from '@common/database/enums/order-direction.enum';
import { STATION_SEARCH_FIELDS } from '@modules/stations/constants/station.constant';

@ApiTags('Stations')
@Controller('stations')
export class StationController {
    constructor(private readonly stationService: StationService) {}

    @Get()
    @Encryption()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'stations',
        successKey: 'findAll',
    })
    @ApiOperation({ summary: 'Get all stations' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search in stationCode, stationName',
    })
    @ApiQuery({ name: 'orderBy', required: false, type: String })
    @ApiQuery({
        name: 'orderDirection',
        required: false,
        enum: OrderDirection,
        description: 'Sort direction: asc or desc',
    })
    @ApiResponse({
        status: 200,
        description: 'List of stations',
        type: StationListResponseDto,
    })
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query() query: Record<string, any>,
        @Query('search') search?: string,
        @Query('orderBy') orderBy?: string,
        @Query('orderDirection') orderDirection?: string,
    ): Promise<StationListResponseDto> {
        const {
            page: _,
            limit: __,
            search: _s,
            orderBy: _o,
            orderDirection: _od,
            ...filter
        } = query;
        const { data, total } = await this.stationService.findAll(
            filter,
            page,
            limit,
            orderBy,
            orderDirection as OrderDirection,
            search,
            STATION_SEARCH_FIELDS,
        );

        return {
            total,
            page,
            limit,
            data: this.stationService.mapList(data),
        };
    }

    @Get(':id')
    @Encryption()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'stations',
        successKey: 'findOne',
    })
    @ApiOperation({ summary: 'Get station by ID' })
    @ApiResponse({
        status: 200,
        description: 'Station found',
        type: StationGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Station not found' })
    async findOne(@Param('id') id: string): Promise<StationGetResponseDto> {
        const station = await this.stationService.findOne(id);
        return this.stationService.mapGet(station);
    }

    @Post()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'stations',
        successKey: 'create',
    })
    @ApiOperation({ summary: 'Create a new station' })
    @ApiResponse({
        status: 201,
        description: 'Station created successfully',
        type: StationGetResponseDto,
    })
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() createDto: StationCreateRequestDto,
    ): Promise<StationGetResponseDto> {
        const station = await this.stationService.create(createDto);
        return this.stationService.mapGet(station);
    }

    @Put(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'stations',
        successKey: 'update',
    })
    @ApiOperation({ summary: 'Update station by ID' })
    @ApiResponse({
        status: 200,
        description: 'Station updated successfully',
        type: StationGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Station not found' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: StationUpdateRequestDto,
    ): Promise<StationGetResponseDto> {
        const station = await this.stationService.update(id, updateDto);
        return this.stationService.mapGet(station);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'stations',
        successKey: 'remove',
    })
    @ApiOperation({ summary: 'Delete station by ID' })
    @ApiResponse({ status: 200, description: 'Station deleted successfully' })
    @ApiResponse({ status: 404, description: 'Station not found' })
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string): Promise<void> {
        return this.stationService.delete(id);
    }
}
