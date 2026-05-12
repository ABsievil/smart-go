import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { OrderDirection } from '@common/database/enums/order-direction.enum';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { CurrentUser } from '@modules/auth/decorators/auth.decorator';
import { FavoriteRouteService } from '@modules/favorite-routes/services/favorite-route.service';
import { FavoriteRouteCreateRequestDto } from '@modules/favorite-routes/dtos/request/favorite-route-create.request.dto';
import { FavoriteRouteGetResponseDto } from '@modules/favorite-routes/dtos/response/favorite-route-get.response.dto';
import { FavoriteRouteListResponseDto } from '@modules/favorite-routes/dtos/response/favorite-route-list.response.dto';

@ApiTags('Favorite routes')
@Controller('favorite-routes')
export class FavoriteRouteController {
    constructor(private readonly favoriteRouteService: FavoriteRouteService) {}

    @Get()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'favorite-routes',
        successKey: 'findAll',
    })
    @ApiOperation({
        summary:
            'Danh sách lộ trình yêu thích (điểm đi / điểm đến như Routing)',
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        type: String,
        example: 'createdAt',
    })
    @ApiQuery({
        name: 'orderDirection',
        required: false,
        enum: OrderDirection,
    })
    @ApiResponse({
        status: 200,
        description: 'OK',
        type: FavoriteRouteListResponseDto,
    })
    async findAll(
        @CurrentUser('_id') userId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('orderBy') orderBy?: string,
        @Query('orderDirection') orderDirectionRaw?: string,
    ): Promise<FavoriteRouteListResponseDto> {
        const orderByField = orderBy?.trim() || 'createdAt';
        const orderDirection =
            orderDirectionRaw === undefined
                ? OrderDirection.DESC
                : orderDirectionRaw?.toLowerCase() === OrderDirection.DESC
                  ? OrderDirection.DESC
                  : OrderDirection.ASC;

        const { data, total } = await this.favoriteRouteService.findAll(
            { userId },
            page,
            limit,
            orderByField,
            orderDirection,
        );

        return {
            total,
            page,
            limit,
            data: this.favoriteRouteService.mapList(data),
        };
    }

    @Get(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'favorite-routes',
        successKey: 'findOne',
    })
    @ApiOperation({
        summary: 'Chi tiết một lộ trình yêu thích đã lưu',
    })
    @ApiResponse({
        status: 200,
        type: FavoriteRouteGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Not found' })
    async findOne(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
    ): Promise<FavoriteRouteGetResponseDto> {
        const favorite = await this.favoriteRouteService.findOne(id, {
            userId,
        });
        return this.favoriteRouteService.mapGet(favorite);
    }

    @Post()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'favorite-routes',
        successKey: 'create',
    })
    @ApiOperation({
        summary:
            'Lưu lộ trình yêu thích (stationCode và/hoặc coordinates — giống payload điểm đầu/cuối của POST /routing/find-path)',
    })
    @ApiResponse({
        status: 201,
        description: 'Created',
        type: FavoriteRouteGetResponseDto,
    })
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser('_id') userId: string,
        @Body() createDto: FavoriteRouteCreateRequestDto,
    ): Promise<FavoriteRouteGetResponseDto> {
        const favorite = await this.favoriteRouteService.create({
            ...createDto,
            userId,
        } as FavoriteRouteCreateRequestDto);
        return this.favoriteRouteService.mapGet(favorite);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'favorite-routes',
        successKey: 'remove',
    })
    @ApiOperation({ summary: 'Xóa một lộ trình yêu thích đã lưu' })
    @ApiResponse({ status: 200, description: 'Deleted' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @HttpCode(HttpStatus.OK)
    async remove(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
    ): Promise<void> {
        return this.favoriteRouteService.delete(id, { userId });
    }
}
