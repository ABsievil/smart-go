import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HuggingFaceService } from '@modules/chatbot/services/huggingface.service';
import { ZillizService } from '@modules/chatbot/services/zilliz.service';
import { IChatMessage } from '@modules/chatbot/interfaces/chat-message.interface';
import { IVectorSearchResult } from '@modules/chatbot/interfaces/vector-search-result.interface';
import {
    ChatbotEmbedType,
    ChatMessageRole,
} from '@modules/chatbot/enums/chatbot.enum';
import { ChatHistoryItemDto } from '@modules/chatbot/dtos/request/chat-history-item.request.dto';
import { EmbedRequestDto } from '@modules/chatbot/dtos/request/embed.request.dto';
import { ChatResponseDto } from '@modules/chatbot/dtos/response/chat.response.dto';
import { EmbedGetResponseDto } from '@modules/chatbot/dtos/response/embed-get.response.dto';
import { EmbedListResponseDto } from '@modules/chatbot/dtos/response/embed-list.response.dto';
import {
    CHAT_MAX_HISTORY_TURNS,
    CHATBOT_SYSTEM_PROMPT,
    CHATBOT_SYSTEM_PROMPT_WITH_CONTEXT,
} from '@modules/chatbot/constants/chatbot.constants';

@Injectable()
export class ChatbotService {
    private readonly contextLimit: number;
    private readonly logger = new Logger(ChatbotService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly huggingFaceService: HuggingFaceService,
        private readonly zillizService: ZillizService,
    ) {
        this.contextLimit = this.configService.get<number>(
            'chatbot.contextLimit',
        );
    }

    /**
     * Xử lý tin nhắn chat: tìm context liên quan từ vector DB,
     * sau đó gọi LLM để sinh câu trả lời có chất lượng.
     * **Luồng xử lý:**
     * 1. Embed tin nhắn thành vector bằng HuggingFace
     * 2. Tìm kiếm tài liệu liên quan trong Zilliz vector DB
     * 3. Gắn context vào system prompt
     * 4. Gọi LLM (HuggingFace) để sinh câu trả lời
     */
    async chat(
        message: string,
        history: ChatHistoryItemDto[] = [],
    ): Promise<ChatResponseDto> {
        // Bước 1: Embed tin nhắn người dùng để tìm context liên quan
        const embedding =
            await this.huggingFaceService.generateEmbedding(message);

        // Bước 2: Tìm tài liệu tương đồng trong Zilliz vector DB
        const contextDocs = await this.zillizService.search(
            embedding,
            this.contextLimit,
        );

        const ragHits = contextDocs.map((d) => ({
            score: Number(d.score.toFixed(4)),
            type: d.type,
            metadata: d.metadata ?? {},
        }));
        this.logger.debug(
            `RAG ${contextDocs.length} hit(s)\n${JSON.stringify(ragHits, null, 2)}`,
        );

        // Bước 3: Gắn context RAG vào system prompt hằng số
        const enrichedSystemPrompt =
            this.buildSystemPromptWithContext(contextDocs);
        this.logger.debug(`Enriched system prompt: ${enrichedSystemPrompt}`);
        // Bước 4: Chuẩn bị lịch sử hội thoại (giới hạn số turn để tránh vượt context window)
        const messages = this.buildMessageHistory(history, message);
        this.logger.debug(`Messages: ${JSON.stringify(messages, null, 2)}`);
        // Bước 5: Gọi LLM sinh câu trả lời
        const reply = await this.huggingFaceService.chatCompletion(
            messages,
            enrichedSystemPrompt,
        );

        return { reply, contextCount: contextDocs.length };
    }

    /**
     * Nhúng một đoạn văn bản kiến thức vào Zilliz vector DB.
     */
    async embed(
        text: string,
        type: ChatbotEmbedType,
        metadata: Record<string, any> = {},
    ): Promise<EmbedGetResponseDto> {
        const embedding = await this.huggingFaceService.generateEmbedding(text);
        const id = await this.zillizService.insert(
            embedding,
            text,
            type,
            metadata,
        );

        this.logger.log(`Embedded knowledge [${type}] with id: ${id}`);

        return { _id: id, text, type };
    }

    /**
     * Nhúng hàng loạt kiến thức từ danh sách items (parse từ file JSON).
     * Các item được xử lý tuần tự để tránh rate-limit từ HuggingFace.
     */
    async embedFromFile(
        items: EmbedRequestDto[],
    ): Promise<EmbedListResponseDto> {
        const data: EmbedGetResponseDto[] = [];

        for (const item of items) {
            const result = await this.embed(
                item.text,
                item.type,
                item.metadata,
            );
            data.push(result);
        }

        this.logger.log(
            `Batch embed completed: ${data.length}/${items.length} items`,
        );

        return { total: items.length, page: 1, limit: items.length, data };
    }

    /**
     * Ghép context RAG vào system prompt để LLM có thêm thông tin thực tế.
     * Vector search trả về `text` (đoạn đã embed, thường ngắn) và `metadata` (chi tiết có cấu trúc).
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

    /** Format chunk context: phần text để embed + metadata chi tiết (JSON) nếu có. */
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

        return `${textLine}\nStructured details (metadata):\n${JSON.stringify(meta, null, 2)}`;
    }

    /**
     * Chuẩn bị danh sách message cho LLM, cắt giới hạn số turn lịch sử.
     */
    private buildMessageHistory(
        history: ChatHistoryItemDto[],
        currentMessage: string,
    ): IChatMessage[] {
        const trimmedHistory = history.slice(-CHAT_MAX_HISTORY_TURNS * 2);

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
