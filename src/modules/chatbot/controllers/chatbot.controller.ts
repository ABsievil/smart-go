import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Logger,
    Query,
    MessageEvent,
    Sse,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiProduces,
    ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { ChatbotService } from '@modules/chatbot/services/chatbot.service';
import { MessageService } from '@modules/messages/services/message.service';
import { messagesToChatHistoryItems } from '@modules/chatbot/utils/message-to-chat-history.util';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import { ChatRequestDto } from '@modules/chatbot/dtos/request/chat.request.dto';
import { EmbedRequestDto } from '@modules/chatbot/dtos/request/embed.request.dto';
import { ChatResponseDto } from '@modules/chatbot/dtos/response/chat.response.dto';
import { EmbedGetResponseDto } from '@modules/chatbot/dtos/response/embed-get.response.dto';
import { EmbedListResponseDto } from '@modules/chatbot/dtos/response/embed-list.response.dto';
import { CurrentUser, Roles } from '@modules/auth/decorators/auth.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { ACCESS_TOKEN_QUERY_PARAM } from '@modules/auth/constants/auth.constants';
import {
    UploadSingleFile,
    UploadedFile,
} from '@common/upload/decorators/upload-file.decorator';
import {
    UPLOAD_ALLOWED_MIME_TYPES,
    UPLOAD_FIELD,
} from '@common/upload/constants/upload.constants';
import { RequestTimeout } from '@common/decorators/request-timeout.decorator';
import {
    CHAT_MAX_HISTORY_TURNS,
    CHAT_STREAM_EVENT,
    CHAT_STREAM_MESSAGE_MAX_LENGTH,
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
        // this.logger.debug(`Chat request: "${dto.message.slice(0, 80)}"`);

        const providedCid = dto.conversationId?.trim();
        const conversationId = providedCid || randomUUID();

        const historyPromise: Promise<
            ReturnType<typeof messagesToChatHistoryItems>
        > = providedCid
            ? this.messageService
                  .findLatestByConversation(
                      providedCid,
                      userId,
                      CHAT_MAX_HISTORY_TURNS * 2,
                  )
                  .then((msgs) => messagesToChatHistoryItems(msgs))
            : Promise.resolve([]);

        const result = await this.chatbotService.chat(
            dto.message,
            historyPromise,
        );

        // Lưu cặp tin nhắn (user + bot) trong MỘT round-trip Mongo,
        // non-blocking để không kéo dài latency trả response về client.
        void this.messageService
            .createMany([
                {
                    conversationId,
                    userId,
                    role: UserRole.USER,
                    content: dto.message,
                } as MessageCreateRequestDto,
                {
                    conversationId,
                    userId,
                    role: UserRole.BOT,
                    content: result.reply,
                } as MessageCreateRequestDto,
            ])
            .catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(
                    `Failed to persist chat messages (cid=${conversationId}): ${msg}`,
                );
            });

        return { ...result, conversationId };
    }

    @Sse('chat/stream')
    @ApiBearerAuth()
    @ApiProduces('text/event-stream')
    @ApiOperation({
        summary: 'Streaming chat — SSE token-by-token từ AI Assistant',
        description: `
\`EventSource\` không gửi được Authorization header → truyền JWT qua query
\`?${ACCESS_TOKEN_QUERY_PARAM}=...\`. Vì là GET nên câu hỏi cũng đi qua query
(\`message\`), do đó độ dài giới hạn \`${CHAT_STREAM_MESSAGE_MAX_LENGTH}\` ký tự
(sau URL-encode) để tránh URL quá dài. Với câu hỏi dài hơn vui lòng dùng
\`POST /chatbot/chat\` (non-streaming).

**Events phát ra:**

| Event    | Khi nào phát                    | Payload JSON                                           |
|----------|---------------------------------|--------------------------------------------------------|
| \`meta\`   | Ngay sau khi RAG xong            | \`{ conversationId, contextCount, cached }\`            |
| \`chunk\`  | Mỗi token/delta từ LLM           | \`{ content: string }\`                                 |
| \`done\`   | Khi reply đã xong                | \`{ conversationId, fullReply, contextCount, cached }\` |
| \`error\`  | Khi có lỗi                       | \`{ message: string }\`                                 |

**Ví dụ client (browser EventSource):**
\`\`\`js
const url = \`/api/v1/chatbot/chat/stream?message=\${encodeURIComponent(msg)}&${ACCESS_TOKEN_QUERY_PARAM}=\${encodeURIComponent(jwt)}\`;
const es = new EventSource(url);
es.addEventListener('chunk', (e) => appendText(JSON.parse(e.data).content));
es.addEventListener('done',  (e) => { console.log(JSON.parse(e.data)); es.close(); });
es.addEventListener('error', (e) => { console.error(e); es.close(); });
\`\`\`

Khi client đóng \`es.close()\` hoặc navigate away, server sẽ huỷ stream
DashScope ngay lập tức (không tốn thêm token).
        `,
    })
    @ApiQuery({
        name: ACCESS_TOKEN_QUERY_PARAM,
        required: true,
        type: String,
        description: 'JWT access token (thay cho Bearer header)',
    })
    @ApiQuery({
        name: 'message',
        required: true,
        type: String,
        description: `Tin nhắn người dùng (max ${CHAT_STREAM_MESSAGE_MAX_LENGTH} ký tự, URL-encoded)`,
        example: 'Làm thế nào để đi từ Bến Thành đến Miền Tây?',
    })
    @ApiQuery({
        name: 'conversationId',
        required: false,
        type: String,
        description:
            'ID hội thoại để nối lịch sử (bỏ qua nếu là hội thoại mới)',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description:
            'Server-Sent Events stream với các event: meta, chunk, done, error.',
    })
    chatStream(
        @CurrentUser('_id') userId: string,
        @Query('message') rawMessage: string,
        @Query('conversationId') rawConversationId?: string,
    ): Observable<MessageEvent> {
        const message = (rawMessage ?? '').trim();
        if (!message) {
            throw new BadRequestException('Query param "message" is required');
        }
        if (message.length > CHAT_STREAM_MESSAGE_MAX_LENGTH) {
            throw new BadRequestException(
                `Query param "message" exceeds ${CHAT_STREAM_MESSAGE_MAX_LENGTH} characters — use POST /chatbot/chat for long inputs`,
            );
        }

        const providedCid = rawConversationId?.trim();
        const conversationId = providedCid || randomUUID();

        const historyPromise: Promise<
            ReturnType<typeof messagesToChatHistoryItems>
        > = providedCid
            ? this.messageService
                  .findLatestByConversation(
                      providedCid,
                      userId,
                      CHAT_MAX_HISTORY_TURNS * 2,
                  )
                  .then((msgs) => messagesToChatHistoryItems(msgs))
            : Promise.resolve([]);

        return new Observable<MessageEvent>((subscriber) => {
            // Abort signal được teardown handler kích hoạt khi client
            // đóng kết nối hoặc khi observable bị unsubscribe — giúp
            // huỷ stream DashScope ngay và không tốn thêm token.
            const abort = new AbortController();

            let fullReply = '';
            let contextCount = 0;
            let cached = false;

            const run = async (): Promise<void> => {
                try {
                    for await (const evt of this.chatbotService.chatStream(
                        message,
                        historyPromise,
                        abort.signal,
                    )) {
                        if (abort.signal.aborted) return;

                        if (evt.type === 'meta') {
                            contextCount = evt.contextCount;
                            cached = evt.cached;
                            subscriber.next({
                                type: CHAT_STREAM_EVENT.META,
                                data: {
                                    conversationId,
                                    contextCount,
                                    cached,
                                },
                            });
                        } else {
                            fullReply += evt.content;
                            subscriber.next({
                                type: CHAT_STREAM_EVENT.CHUNK,
                                data: { content: evt.content },
                            });
                        }
                    }

                    if (abort.signal.aborted) return;

                    subscriber.next({
                        type: CHAT_STREAM_EVENT.DONE,
                        data: {
                            conversationId,
                            fullReply,
                            contextCount,
                            cached,
                        },
                    });
                    subscriber.complete();
                } catch (err) {
                    if (abort.signal.aborted) return;
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    this.logger.error(
                        `chatStream failed (cid=${conversationId}): ${msg}`,
                    );
                    subscriber.next({
                        type: CHAT_STREAM_EVENT.ERROR,
                        data: { message: msg },
                    });
                    subscriber.complete();
                } finally {
                    // Chỉ persist khi thực sự có reply và không bị client
                    // abort giữa chừng — tránh lưu reply half-baked.
                    if (fullReply && !abort.signal.aborted) {
                        void this.messageService
                            .createMany([
                                {
                                    conversationId,
                                    userId,
                                    role: UserRole.USER,
                                    content: message,
                                } as MessageCreateRequestDto,
                                {
                                    conversationId,
                                    userId,
                                    role: UserRole.BOT,
                                    content: fullReply,
                                } as MessageCreateRequestDto,
                            ])
                            .catch((dbErr) => {
                                const dbMsg =
                                    dbErr instanceof Error
                                        ? dbErr.message
                                        : String(dbErr);
                                this.logger.error(
                                    `Failed to persist streamed chat (cid=${conversationId}): ${dbMsg}`,
                                );
                            });
                    }
                }
            };

            void run();

            return () => abort.abort();
        });
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

**Hiệu năng (bulk):** Mỗi lô gọi embedding DashScope một lần cho nhiều câu và insert Zilliz một lần cho cả lô. Điều chỉnh \`CHATBOT_EMBED_BATCH_SIZE\` (mặc định 64, tối đa 256) nếu cần cân bằng tốc độ / giới hạn API.
    `,
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Kết quả nhúng hàng loạt',
        type: EmbedListResponseDto,
    })
    @HttpCode(HttpStatus.CREATED)
    @UploadSingleFile({ fieldName: UPLOAD_FIELD.FILE })
    async embedFromFile(
        @UploadedFile({
            allowedMimeTypes: [...UPLOAD_ALLOWED_MIME_TYPES.TEXT_AND_DOCUMENT],
        })
        file: Express.Multer.File,
        @Query('offset') rawOffset?: string,
    ): Promise<EmbedListResponseDto> {
        const offset = Math.max(0, parseInt(rawOffset ?? '0', 10) || 0);
        let items: EmbedRequestDto[];

        try {
            items = JSON.parse(file.buffer.toString('utf-8'));

            if (!Array.isArray(items) || !items.length) {
                throw new BadRequestException(
                    'File JSON phải chứa mảng các mục kiến thức không rỗng',
                );
            }

            return this.chatbotService.embedFromFile(items, offset);
        } catch (error) {
            this.logger.error(`Error parsing JSON file: ${error.message}`);
            throw new BadRequestException('File JSON không hợp lệ');
        }
    }
}
