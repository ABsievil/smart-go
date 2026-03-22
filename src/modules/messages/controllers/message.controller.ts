import {
    BadRequestException,
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
    Put,
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
import { MessageService } from '@modules/messages/services/message.service';
import { MessageCreateRequestDto } from '@modules/messages/dtos/request/message-create.request.dto';
import { MessageUpdateRequestDto } from '@modules/messages/dtos/request/message-update.request.dto';
import { MessageGetResponseDto } from '@modules/messages/dtos/response/message-get.response.dto';
import { MessageListResponseDto } from '@modules/messages/dtos/response/message-list.response.dto';

@ApiTags('Messages')
@Controller('messages')
export class MessageController {
    constructor(private readonly messageService: MessageService) {}

    @Get()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'messages',
        successKey: 'findAll',
    })
    @ApiOperation({ summary: 'List messages in a conversation' })
    @ApiQuery({ name: 'conversationId', required: true, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search in message content (uses searchFields or defaults to content)',
    })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        type: String,
        example: 'createdAt',
        description: 'Field to sort by (merged with default createdAt when omitted)',
    })
    @ApiQuery({
        name: 'orderDirection',
        required: false,
        enum: OrderDirection,
        description: 'Sort direction when orderBy is set',
    })
    @ApiQuery({
        name: 'searchFields',
        required: false,
        type: String,
        example: 'content',
        description: 'Comma-separated field names for search (default: content)',
    })
    @ApiResponse({
        status: 200,
        description: 'List of messages',
        type: MessageListResponseDto,
    })
    async findAll(
        @CurrentUser('_id') userId: string,
        @Query('conversationId') conversationId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search?: string,
        @Query('orderBy') orderBy?: string,
        @Query('orderDirection') orderDirectionRaw?: string,
        @Query('searchFields') searchFieldsRaw?: string,
    ): Promise<MessageListResponseDto> {
        const cid = conversationId?.trim();
        if (!cid) {
            throw new BadRequestException('conversationId is required');
        }

        const searchTrimmed = search?.trim();
        const searchFields =
            searchFieldsRaw
                ?.split(',')
                .map((s) => s.trim())
                .filter(Boolean) ??
            (searchTrimmed ? ['content'] : undefined);

        const orderDirection =
            orderDirectionRaw?.toLowerCase() === OrderDirection.DESC
                ? OrderDirection.DESC
                : OrderDirection.ASC;

        const { data, total } = await this.messageService.findAll(
            { conversationId: cid, userId },
            page,
            limit,
            { sort: { createdAt: 1 } },
            searchTrimmed,
            orderBy?.trim() || undefined,
            orderDirection,
            searchFields,
        );

        return {
            total,
            page,
            limit,
            data: this.messageService.mapList(data),
        };
    }

    @Get(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'messages',
        successKey: 'findOne',
    })
    @ApiOperation({ summary: 'Get message by ID' })
    @ApiResponse({
        status: 200,
        description: 'Message found',
        type: MessageGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Message not found' })
    async findOne(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
    ): Promise<MessageGetResponseDto> {
        const message = await this.messageService.findOne(id, { userId });
        return this.messageService.mapGet(message);
    }

    @Post()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'messages',
        successKey: 'create',
    })
    @ApiOperation({ summary: 'Create a message' })
    @ApiResponse({
        status: 201,
        description: 'Message created',
        type: MessageGetResponseDto,
    })
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser('_id') userId: string,
        @Body() createDto: MessageCreateRequestDto,
    ): Promise<MessageGetResponseDto> {
        const message = await this.messageService.create({
            ...createDto,
            userId,
        } as MessageCreateRequestDto);
        return this.messageService.mapGet(message);
    }

    @Put(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'messages',
        successKey: 'update',
    })
    @ApiOperation({ summary: 'Update message by ID' })
    @ApiResponse({
        status: 200,
        description: 'Message updated',
        type: MessageGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Message not found' })
    async update(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
        @Body() updateDto: MessageUpdateRequestDto,
    ): Promise<MessageGetResponseDto> {
        const updatedMessage = await this.messageService.update(
            id,
            updateDto,
            { userId },
        );
        return this.messageService.mapGet(updatedMessage);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'messages',
        successKey: 'remove',
    })
    @ApiOperation({ summary: 'Delete message by ID' })
    @ApiResponse({ status: 200, description: 'Message deleted' })
    @ApiResponse({ status: 404, description: 'Message not found' })
    @HttpCode(HttpStatus.OK)
    async remove(
        @CurrentUser('_id') userId: string,
        @Param('id') id: string,
    ): Promise<void> {
        return this.messageService.delete(id, { userId });
    }
}
