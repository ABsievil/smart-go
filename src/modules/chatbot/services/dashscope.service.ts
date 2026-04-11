import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IChatMessage } from '@modules/chatbot/interfaces/chat-message.interface';
import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';
import { EMBEDDING_API_BATCH_LIMIT } from '@modules/chatbot/constants/chatbot.constants';
@Injectable()
export class DashScopeService implements OnModuleInit {
    private readonly logger = new Logger(DashScopeService.name);
    private client: OpenAI;

    private chatModel: string;
    private embeddingModel: string;
    private embeddingDimension: number;
    private maxNewTokens: number;
    private temperature: number;
    private enableThinking: boolean;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>(
            'chatbot.dashscope.apiKey',
        );
        const baseURL = this.configService.get<string>(
            'chatbot.dashscope.baseURL',
        );

        this.chatModel = this.configService.get<string>(
            'chatbot.dashscope.chatModel',
        );
        this.embeddingModel = this.configService.get<string>(
            'chatbot.dashscope.embeddingModel',
        );
        this.embeddingDimension = this.configService.get<number>(
            'chatbot.dashscope.embeddingDimension',
        );
        this.maxNewTokens = this.configService.get<number>(
            'chatbot.dashscope.maxNewTokens',
        );
        this.temperature = this.configService.get<number>(
            'chatbot.dashscope.temperature',
        );
        this.enableThinking = this.configService.get<boolean>(
            'chatbot.dashscope.enableThinking',
        );

        this.client = new OpenAI({ apiKey, baseURL });

        this.logger.log(
            `DashScopeService initialized — chat: ${this.chatModel}, embedding: ${this.embeddingModel} (dim=${this.embeddingDimension}), thinking=${this.enableThinking}`,
        );
    }

    // ─── Embedding ──────────────────────────────────────────────────────────────

    /**
     * @description Sinh embedding vector cho một đoạn văn bản.
     * Sử dụng DashScope OpenAI-compatible endpoint với model text-embedding-v4.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!text?.trim()) {
            throw new BadRequestException(
                'Embedding input text must not be empty',
            );
        }

        try {
            const response = await this.client.embeddings.create({
                model: this.embeddingModel,
                input: text,
                dimensions: this.embeddingDimension,
            } as Parameters<typeof this.client.embeddings.create>[0]);

            return response.data[0].embedding;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `DashScope featureExtraction failed [model=${this.embeddingModel}]: ${message}`,
            );
            throw new InternalServerErrorException(
                `Embedding service error: ${message}`,
            );
        }
    }

    /**
     * @description Sinh embedding hàng loạt — một request cho nhiều câu, giảm round-trip khi sync file lớn.
     */
    async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
        if (!texts.length) return [];

        for (const text of texts) {
            if (!text?.trim()) {
                throw new BadRequestException(
                    'Embedding batch: every item must have non-empty text',
                );
            }
        }

        const results: number[][] = [];

        for (let i = 0; i < texts.length; i += EMBEDDING_API_BATCH_LIMIT) {
            const chunk = texts.slice(i, i + EMBEDDING_API_BATCH_LIMIT);

            try {
                const response = await this.client.embeddings.create({
                    model: this.embeddingModel,
                    input: chunk,
                    dimensions: this.embeddingDimension,
                } as Parameters<typeof this.client.embeddings.create>[0]);

                const sorted = response.data
                    .sort((a, b) => a.index - b.index)
                    .map((d) => d.embedding);

                results.push(...sorted);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err);
                this.logger.error(
                    `DashScope batch featureExtraction failed [model=${this.embeddingModel}, chunk=${i}..${i + chunk.length - 1}]: ${message}`,
                );
                throw new InternalServerErrorException(
                    `Embedding service error: ${message}`,
                );
            }
        }

        return results;
    }

    // ─── Chat ───────────────────────────────────────────────────────────────────

    /**
     * @description Gọi Qwen chat completion qua DashScope OpenAI-compatible API.
     * Khi enableThinking=true, model sinh ra quá trình suy luận (reasoning_content)
     * trước khi trả lời — chỉ trả về nội dung cuối (content) cho người dùng.
     */
    async chatCompletion(
        messages: IChatMessage[],
        systemPrompt: string,
    ): Promise<string> {
        const payload: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...messages.map((m) => ({
                role: this.toChatRole(m.role),
                content: m.content,
            })),
        ];

        try {
            // enable_thinking là DashScope extension
            const createParams = {
                model: this.chatModel,
                messages: payload,
                max_tokens: this.maxNewTokens,
                temperature: this.temperature,
                ...(this.enableThinking && { enable_thinking: true }),
            };

            const result = await (
                this.client.chat.completions.create as (
                    p: typeof createParams,
                ) => Promise<OpenAI.Chat.ChatCompletion>
            )(createParams);

            const message = result.choices[0]
                ?.message as OpenAI.Chat.ChatCompletionMessage & {
                reasoning_content?: string;
            };

            if (this.enableThinking && message?.reasoning_content) {
                this.logger.debug(
                    `[Qwen thinking] ${message.reasoning_content.slice(0, 600)}${message.reasoning_content.length > 600 ? '…' : ''}`,
                );
            }

            return message?.content ?? '';
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `DashScope chatCompletion failed [model=${this.chatModel}]: ${message}`,
            );
            throw new InternalServerErrorException(
                `Chat service error: ${message}`,
            );
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private toChatRole(role: ChatMessageRole): 'system' | 'user' | 'assistant' {
        switch (role) {
            case ChatMessageRole.SYSTEM:
                return 'system';
            case ChatMessageRole.ASSISTANT:
                return 'assistant';
            case ChatMessageRole.USER:
            default:
                return 'user';
        }
    }
}
