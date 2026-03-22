import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatbotService } from '@modules/chatbot/services/chatbot.service';
import { MessageService } from '@modules/messages/services/message.service';
import { OrderDirection } from '@common/database/enums/order-direction.enum';
import { messagesToChatHistoryItems } from '@modules/chatbot/utils/message-to-chat-history.util';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { ChatRequestDto } from '@modules/chatbot/dtos/request/chat.request.dto';
import { EmbedRequestDto } from '@modules/chatbot/dtos/request/embed.request.dto';
import { ChatResponseDto } from '@modules/chatbot/dtos/response/chat.response.dto';
import { EmbedGetResponseDto } from '@modules/chatbot/dtos/response/embed-get.response.dto';
import { EmbedListResponseDto } from '@modules/chatbot/dtos/response/embed-list.response.dto';
import { CurrentUser, Roles } from '@modules/auth/decorators/auth.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import {
    UploadSingleFile,
    UploadedFile,
} from '@common/upload/decorators/upload-file.decorator';
import { RequestTimeout } from '@common/decorators/request-timeout.decorator';
import {
    CHAT_MAX_HISTORY_TURNS,
    EMBED_FILE_TIMEOUT_MS,
} from '@modules/chatbot/constants/chatbot.constants';
import { randomUUID } from 'node:crypto';
import { MessageCreateRequestDto } from '@modules/messages/dtos/request/message-create.request.dto';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
    private readonly logger = new Logger(ChatbotController.name);

    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly messageService: MessageService,
    ) {}

    @Post('chat')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'chatbot',
        successKey: 'chat',
    })
    @ApiOperation({
        summary: 'Gửi tin nhắn đến Smart Go AI Assistant',
        description: `
Gửi tin nhắn và nhận câu trả lời từ AI Assistant với hỗ trợ RAG (Retrieval-Augmented Generation).
**Hỗ trợ:**
- Lịch sử cuộc trò chuyện theo \`conversationId\` (tối đa ${CHAT_MAX_HISTORY_TURNS} lượt, lấy từ DB)
- RAG từ knowledge base (tuyến, trạm, FAQ)
- Lưu tin người dùng và câu trả lời bot vào DB; response trả về \`conversationId\` (hội thoại mới được tạo UUID nếu chưa gửi)
        `,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Câu trả lời từ AI Assistant',
        type: ChatResponseDto,
    })
    @HttpCode(HttpStatus.OK)
    async chat(
        @CurrentUser('_id') userId: string,
        @Body() dto: ChatRequestDto,
    ): Promise<ChatResponseDto> {
        this.logger.debug(`Chat request: "${dto.message.slice(0, 80)}"`);

        const providedCid = dto.conversationId?.trim();
        const conversationId = providedCid || randomUUID();
        let history = [];

        if (providedCid) {
            const { data } = await this.messageService.findAll(
                { conversationId: providedCid, userId },
                1,
                CHAT_MAX_HISTORY_TURNS * 2,
                'createdAt',
                OrderDirection.DESC,
            );
            const chronological = [...data].reverse();
            history = messagesToChatHistoryItems(chronological);
        }

        const result = await this.chatbotService.chat(dto.message, history);

        await this.messageService.create({
            conversationId,
            userId,
            role: UserRole.USER,
            content: dto.message,
        } as MessageCreateRequestDto);

        await this.messageService.create({
            conversationId,
            userId,
            role: UserRole.BOT,
            content: result.reply,
        } as MessageCreateRequestDto);

        return { ...result, conversationId };
    }

    @Post('embed')
    @ApiBearerAuth()
    @Roles(UserRole.ADMIN)
    @LanguageResponse({
        module: 'chatbot',
        successKey: 'embed',
    })
    @ApiOperation({
        summary: '[Admin] Nhúng kiến thức vào vector database',
        description: `
Dành riêng cho Admin. Nhúng một đoạn văn bản kiến thức vào Zilliz vector DB
để chatbot có thể tra cứu khi trả lời câu hỏi của người dùng.

**Loại nội dung hỗ trợ:** route, station, faq, general
        `,
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Vector đã được lưu thành công',
        type: EmbedGetResponseDto,
    })
    async embed(@Body() dto: EmbedRequestDto): Promise<EmbedGetResponseDto> {
        return this.chatbotService.embed(dto.text, dto.type, dto.metadata);
    }

    @Post('embed/file')
    @ApiBearerAuth()
    @Roles(UserRole.ADMIN)
    @RequestTimeout(EMBED_FILE_TIMEOUT_MS)
    @LanguageResponse({
        module: 'chatbot',
        successKey: 'embedFile',
    })
    @UploadSingleFile({ allowedMimeTypes: ['application/json'] })
    @ApiOperation({
        summary: '[Admin] Nhúng kiến thức hàng loạt từ file JSON',
        description: `
Dành riêng cho Admin. Upload file JSON chứa mảng các mục kiến thức để nhúng vào Zilliz vector DB.

**Cấu trúc file JSON:**
\`\`\`json
[
  {
    "text": "Tuyến xe buýt số 01 chạy từ Bến xe Miền Tây đến Bến Thành.",
    "type": "route",
    "metadata": { "routeCode": "01" }
  }
]
\`\`\`

**Loại nội dung hỗ trợ:** route, station, faq, general
    `,
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Kết quả nhúng hàng loạt',
        type: EmbedListResponseDto,
    })
    async embedFromFile(
        @UploadedFile({ allowedMimeTypes: ['application/json'] })
        file: Express.Multer.File,
    ): Promise<EmbedListResponseDto> {
        let items: EmbedRequestDto[];

        try {
            items = JSON.parse(file.buffer.toString('utf-8'));
        } catch {
            throw new BadRequestException('File JSON không hợp lệ');
        }

        if (!Array.isArray(items) || !items.length) {
            throw new BadRequestException(
                'File JSON phải chứa mảng các mục kiến thức không rỗng',
            );
        }

        return this.chatbotService.embedFromFile(items);
    }
}
