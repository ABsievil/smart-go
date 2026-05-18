import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DashScopeService } from '@modules/chatbot/services/dashscope.service';
import { ZillizService } from '@modules/chatbot/services/zilliz.service';
import { ChatbotCacheService } from '@modules/chatbot/services/chatbot-cache.service';
import { IChatMessage } from '@modules/chatbot/interfaces/chat-message.interface';
import { IRagPrepareResult } from '@modules/chatbot/interfaces/rag-prepare-result.interface';
import { IVectorSearchResult } from '@modules/chatbot/interfaces/vector-search-result.interface';
import {
    ChatbotEmbedType,
    ChatMessageRole,
    RagPrepareKind,
} from '@modules/chatbot/enums/chatbot.enum';
import { ChatHistoryItemDto } from '@modules/chatbot/dtos/request/chat-history-item.request.dto';
import { EmbedRequestDto } from '@modules/chatbot/dtos/request/embed.request.dto';
import { ChatResponseDto } from '@modules/chatbot/dtos/response/chat.response.dto';
import { EmbedGetResponseDto } from '@modules/chatbot/dtos/response/embed-get.response.dto';
import { EmbedListResponseDto } from '@modules/chatbot/dtos/response/embed-list.response.dto';
import {
    CHAT_HISTORY_MESSAGE_LIMIT,
    CHATBOT_SYSTEM_PROMPT,
    CHATBOT_SYSTEM_PROMPT_WITH_CONTEXT,
} from '@modules/chatbot/constants/chatbot.constants';
import { ChatStreamEvent } from '@modules/chatbot/interfaces/chat-message.interface';
@Injectable()
export class ChatbotService {
    private readonly contextLimit: number;
    private readonly embedFileBatchSize: number;
    private readonly logger = new Logger(ChatbotService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly dashScopeService: DashScopeService,
        private readonly zillizService: ZillizService,
        private readonly cacheService: ChatbotCacheService,
    ) {
        this.contextLimit = this.configService.get<number>(
            'chatbot.contextLimit',
        );
        this.embedFileBatchSize = this.configService.get<number>(
            'chatbot.embedFileBatchSize',
        );
    }

    /**
     * @description Wrapper có cache cho embedding — dùng nội bộ bởi cả `chat` và `chatStream`
     */
    private async embedWithCache(text: string): Promise<number[]> {
        const cached = await this.cacheService.getEmbedding(text);
        if (cached) return cached;

        const fresh = await this.dashScopeService.generateEmbedding(text);
        void this.cacheService.setEmbedding(text, fresh);
        return fresh;
    }

    /**
     * @description Chuẩn bị RAG song song:
     * - Pipeline embed → Zilliz khởi chạy ngay (không chờ history Mongo/Redis).
     * - History resolve song song; reply-cache chỉ khi hội thoại mới.
     * - Cache hit reply → trả sớm (pipeline embed/Zilliz có thể chạy nền, bỏ qua).
     */
    private async prepareRagForChat(
        message: string,
        historyInput: ChatHistoryItemDto[] | Promise<ChatHistoryItemDto[]>,
    ): Promise<IRagPrepareResult> {
        const historyPromise = Promise.resolve(historyInput);
        const contextDocsPromise = this.embedWithCache(message).then(
            (embedding) =>
                this.zillizService.search(embedding, this.contextLimit),
        );

        const history = await historyPromise;

        if (history.length === 0) {
            const cachedReply = await this.cacheService.getReply(message);
            if (cachedReply) {
                return {
                    kind: RagPrepareKind.REPLY_CACHE,
                    history,
                    cached: cachedReply,
                };
            }
        }

        const contextDocs = await contextDocsPromise;
        return { kind: RagPrepareKind.RAG, history, contextDocs };
    }

    /**
     * @description Xử lý tin nhắn chat: tìm context liên quan từ vector DB,
     * sau đó gọi LLM Model để sinh câu trả lời.
     *
     * **Luồng xử lý:**
     * 1. Song song: embed message (DashScope) + resolve history (Mongo)
     * 2. Tìm kiếm tài liệu liên quan trong Zilliz (có lọc score)
     * 3. Gắn context vào system prompt
     * 4. Gọi LLM model để sinh câu trả lời
     *
     * Caller có thể truyền `history` dưới dạng `Promise` để cho phép
     * embedding chạy song song với query Mongo — giảm ~150-400ms/lượt.
     */
    async chat(
        message: string,
        historyInput: ChatHistoryItemDto[] | Promise<ChatHistoryItemDto[]> = [],
    ): Promise<Omit<ChatResponseDto, 'conversationId'>> {
        const prepared = await this.prepareRagForChat(message, historyInput);

        if (prepared.kind === RagPrepareKind.REPLY_CACHE) {
            return {
                reply: prepared.cached.reply,
                contextCount: prepared.cached.contextCount,
            };
        }

        const { history, contextDocs } = prepared;
        // this.logger.debug(
        //     `RAG ${contextDocs.length} hit(s)\n${JSON.stringify(contextDocs, null, 2)}`,
        // );
        const enrichedSystemPrompt =
            this.buildSystemPromptWithContext(contextDocs);
        // this.logger.debug(`Enriched system prompt: ${enrichedSystemPrompt}`);

        const messages = this.buildMessageHistory(history, message);
        // this.logger.debug(`Messages: ${JSON.stringify(messages, null, 2)}`);
        const reply = await this.dashScopeService.chatCompletion(
            messages,
            enrichedSystemPrompt,
        );

        if (history.length === 0 && reply) {
            void this.cacheService.setReply(message, {
                reply,
                contextCount: contextDocs.length,
            });
        }

        return { reply, contextCount: contextDocs.length };
    }

    /**
     * @description Phiên bản streaming của `chat` — yield từng event:
     *  1. Pipeline embed → Zilliz chạy ngay; history (Redis/Mongo) song song.
     *  2. Hội thoại mới + reply cache hit → `meta` + một `token`, kết thúc.
     *  3. Ngược lại: emit `meta` sau RAG → stream token LLM; gom reply để persist.
     *
     * `signal` cho phép controller huỷ stream khi client đóng kết nối.
     */
    async *chatStream(
        message: string,
        historyInput: ChatHistoryItemDto[] | Promise<ChatHistoryItemDto[]> = [],
        signal?: AbortSignal,
    ): AsyncGenerator<ChatStreamEvent, { fullReply: string }, void> {
        const prepared = await this.prepareRagForChat(message, historyInput);

        if (prepared.kind === RagPrepareKind.REPLY_CACHE) {
            yield {
                type: 'meta',
                contextCount: prepared.cached.contextCount,
                cached: true,
            };
            yield { type: 'token', content: prepared.cached.reply };
            return { fullReply: prepared.cached.reply };
        }

        const { history, contextDocs } = prepared;

        yield {
            type: 'meta',
            contextCount: contextDocs.length,
            cached: false,
        };

        const enrichedSystemPrompt =
            this.buildSystemPromptWithContext(contextDocs);
        const messages = this.buildMessageHistory(history, message);

        let fullReply = '';
        for await (const token of this.dashScopeService.chatCompletionStream(
            messages,
            enrichedSystemPrompt,
            signal,
        )) {
            if (signal?.aborted) break;
            fullReply += token;
            yield { type: 'token', content: token };
        }

        if (!signal?.aborted && history.length === 0 && fullReply) {
            void this.cacheService.setReply(message, {
                reply: fullReply,
                contextCount: contextDocs.length,
            });
        }

        return { fullReply };
    }

    /**
     * Nhúng một đoạn văn bản kiến thức vào Zilliz vector DB.
     *
     * **Fix #1 — rich embedding:** Vector được sinh từ chuỗi kết hợp `text` + tất cả
     * các trường trong `metadata`, giúp tìm kiếm chính xác khi người dùng hỏi về các
     * thuộc tính cụ thể (giá vé, giờ hoạt động, tần suất…) mà chỉ nằm trong metadata.
     * Trường `text` gốc vẫn được lưu riêng để hiển thị cho LLM.
     */
    async embed(
        text: string,
        type: ChatbotEmbedType,
        metadata: Record<string, any> = {},
    ): Promise<EmbedGetResponseDto> {
        const embeddingText = this.buildEmbeddingText(text, type, metadata);
        const embedding =
            await this.dashScopeService.generateEmbedding(embeddingText);
        const id = await this.zillizService.insert(
            embedding,
            text,
            type,
            metadata,
        );

        this.logger.log(`Embedded knowledge [${type}] id=${id}`);

        return { _id: id, text, type };
    }

    /**
     * Nhúng hàng loạt từ file JSON: gộp embedding và insert Zilliz theo lô.
     * @param offset Bỏ qua N items đầu — dùng để resume khi bị ngắt giữa chừng.
     */
    async embedFromFile(
        items: EmbedRequestDto[],
        offset = 0,
    ): Promise<EmbedListResponseDto> {
        const data: EmbedGetResponseDto[] = [];
        const batchSize = Math.max(1, this.embedFileBatchSize ?? 64);
        const total = items.length;

        const pending = offset > 0 ? items.slice(offset) : items;
        const totalBatches = pending.length
            ? Math.ceil(pending.length / batchSize)
            : 0;

        this.logger.log(
            `Batch embed started: ${pending.length}/${total} item(s) (offset=${offset}), ${totalBatches} batch(es), batchSize=${batchSize}`,
        );

        let batchIndex = 0;
        for (let i = 0; i < pending.length; i += batchSize) {
            batchIndex++;
            const slice = pending.slice(i, i + batchSize);

            // Xây dựng rich embedding text cho từng item trong batch
            const embeddingTexts = slice.map((item) =>
                this.buildEmbeddingText(
                    item.text,
                    item.type,
                    item.metadata ?? {},
                ),
            );

            const embeddings =
                await this.dashScopeService.generateEmbeddingsBatch(
                    embeddingTexts,
                );

            if (embeddings.length !== slice.length) {
                throw new InternalServerErrorException(
                    `Embedding batch size mismatch: expected ${slice.length}, got ${embeddings.length}`,
                );
            }

            const rows = slice.map((item, j) => ({
                embedding: embeddings[j],
                text: item.text,
                type: item.type,
                metadata: item.metadata ?? {},
            }));

            const ids = await this.zillizService.insertBatch(rows);

            for (let j = 0; j < slice.length; j++) {
                data.push({
                    _id: ids[j],
                    text: slice[j].text,
                    type: slice[j].type,
                });
            }

            const processed = data.length;
            const pct =
                total > 0 ? ((processed / total) * 100).toFixed(1) : '0.0';
            this.logger.log(
                `Batch embed progress: ${processed}/${total} (${pct}%) — batch ${batchIndex}/${totalBatches}`,
            );
        }

        this.logger.log(
            `Batch embed completed: ${data.length}/${pending.length} items embedded (offset=${offset}, batchSize=${batchSize})`,
        );

        return { total, page: 1, limit: pending.length, data };
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    /**
     * @description Xây dựng chuỗi văn bản giàu thông tin để sinh embedding vector.
     *
     * Bao gồm ba tầng thông tin:
     *  1. `[type]` prefix  — giúp vector phân biệt loại nội dung (faq/route/station/general)
     *  2. `text`           — mô tả tự nhiên, thường là câu hỏi hoặc tên tuyến/trạm
     *  3. metadata fields  — các thuộc tính có cấu trúc (giá vé, giờ chạy, câu trả lời FAQ…)
     */
    private buildEmbeddingText(
        text: string,
        type: ChatbotEmbedType,
        metadata: Record<string, any> = {},
    ): string {
        const base = `[${type}] ${text}`;

        const keys = Object.keys(metadata);
        if (!keys.length) return base;

        const metaParts = keys
            .filter((k) => {
                const v = metadata[k];
                return v !== null && v !== undefined && v !== '';
            })
            .map((k) => {
                const v = metadata[k];
                const valStr = Array.isArray(v)
                    ? v.filter(Boolean).join(', ')
                    : String(v);
                return `${k}: ${valStr}`;
            });

        if (!metaParts.length) return base;
        return `${base}\n${metaParts.join('. ')}`;
    }

    /**
     * Ghép context RAG vào system prompt.
     * Vector search trả về `text` (đoạn gốc) và `metadata` (chi tiết có cấu trúc).
     */
    private buildSystemPromptWithContext(
        contextDocs: IVectorSearchResult[],
    ): string {
        if (!contextDocs.length) {
            return CHATBOT_SYSTEM_PROMPT;
        }

        const contextBlock = contextDocs
            .map((doc, i) => this.formatContextChunk(doc, i))
            .join('\n\n');

        return CHATBOT_SYSTEM_PROMPT_WITH_CONTEXT.replace(
            '{context}',
            contextBlock,
        );
    }

    /**
     * @description Format từng chunk context: text gốc + metadata JSON nếu có.
     */
    private formatContextChunk(
        doc: IVectorSearchResult,
        index: number,
    ): string {
        const label = `[${index + 1}]`;
        const textLine = doc.text?.trim()
            ? `${label} ${doc.text.trim()}`
            : `${label} (type: ${doc.type}, no text field)`;

        const meta = doc.metadata;
        if (!meta || Object.keys(meta).length === 0) {
            return textLine;
        }

        return `${textLine}\nStructured details (metadata):\n${JSON.stringify(meta)}`;
    }

    /**
     * @description Chuẩn bị danh sách message cho LLM, cắt giới hạn số turn lịch sử.
     */
    private buildMessageHistory(
        history: ChatHistoryItemDto[],
        currentMessage: string,
    ): IChatMessage[] {
        const trimmedHistory = history.slice(-CHAT_HISTORY_MESSAGE_LIMIT);

        return [
            ...trimmedHistory.map((item) => ({
                role: item.role,
                content: item.content,
            })),
            {
                role: ChatMessageRole.USER,
                content: currentMessage,
            },
        ];
    }
}
