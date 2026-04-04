import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    InferenceClient,
    type InferenceProvider,
} from '@huggingface/inference';
import OpenAI from 'openai';
import { IChatMessage } from '@modules/chatbot/interfaces/chat-message.interface';
import { ChatMessageRole } from '@modules/chatbot/enums/chatbot.enum';

@Injectable()
export class HuggingFaceService implements OnModuleInit {
    private readonly logger = new Logger(HuggingFaceService.name);
    // Client embedding — @huggingface/inference SDK
    private inferenceClient: InferenceClient;

    // Client chat — OpenAI SDK trỏ vào HuggingFace router
    private openAiClient: OpenAI;

    private chatModel: string;
    private embeddingModel: string;
    private maxNewTokens: number;
    private temperature: number;
    private inferenceProvider: string;
    private routerBaseUrl: string;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const token = this.configService.get<string>(
            'chatbot.huggingFace.token',
        );
        this.chatModel = this.configService.get<string>(
            'chatbot.huggingFace.chatModel',
        );
        this.embeddingModel = this.configService.get<string>(
            'chatbot.huggingFace.embeddingModel',
        );
        this.maxNewTokens = this.configService.get<number>(
            'chatbot.huggingFace.maxNewTokens',
        );
        this.temperature = this.configService.get<number>(
            'chatbot.huggingFace.temperature',
        );
        this.inferenceProvider = this.configService.get<string>(
            'chatbot.huggingFace.inferenceProvider',
        );
        this.routerBaseUrl = this.configService.get<string>(
            'chatbot.huggingFace.routerBaseUrl',
        );

        this.inferenceClient = new InferenceClient(token);
        this.openAiClient = new OpenAI({
            baseURL: this.routerBaseUrl,
            apiKey: token,
        });

        this.logger.log(
            `HuggingFaceService initialized — chat: ${this.chatModel}, embedding: ${this.embeddingModel}`,
        );
    }

    /**
     * Tạo embedding vector cho một đoạn văn bản.
     * Dùng @huggingface/inference SDK với provider hf-inference.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!text?.trim()) {
            throw new BadRequestException(
                'Embedding input text must not be empty',
            );
        }

        let output: unknown;

        try {
            output = await this.inferenceClient.featureExtraction({
                model: this.embeddingModel,
                inputs: text,
                provider: this.inferenceProvider as InferenceProvider,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `HuggingFace featureExtraction failed [model=${this.embeddingModel}]: ${message}`,
            );
            throw new InternalServerErrorException(
                `Embedding service error: ${message}`,
            );
        }

        // featureExtraction trả về number[] khi input là string đơn
        if (Array.isArray(output) && typeof output[0] === 'number') {
            return output as number[];
        }

        // Trường hợp trả về number[][] (batch), lấy phần tử đầu
        if (Array.isArray(output) && Array.isArray(output[0])) {
            return (output as number[][])[0];
        }

        throw new InternalServerErrorException(
            'Unexpected embedding output format from HuggingFace',
        );
    }

    /**
     * Embedding hàng loạt (một request HF cho nhiều câu) — dùng cho sync file lớn.
     */
    async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
        if (!texts.length) {
            return [];
        }

        for (const text of texts) {
            if (!text?.trim()) {
                throw new BadRequestException(
                    'Embedding batch: every item must have non-empty text',
                );
            }
        }

        let output: unknown;

        try {
            output = await this.inferenceClient.featureExtraction({
                model: this.embeddingModel,
                inputs: texts,
                provider: this.inferenceProvider as InferenceProvider,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `HuggingFace batch featureExtraction failed [model=${this.embeddingModel}, n=${texts.length}]: ${message}`,
            );
            throw new InternalServerErrorException(
                `Embedding service error: ${message}`,
            );
        }

        return this.normalizeBatchEmbeddingOutput(output, texts.length);
    }

    private meanPool(tokenVectors: number[][]): number[] {
        if (!tokenVectors.length) {
            throw new InternalServerErrorException(
                'Cannot mean-pool empty token sequence',
            );
        }
        const dim = tokenVectors[0].length;
        const acc = new Array(dim).fill(0);
        for (const vec of tokenVectors) {
            for (let d = 0; d < dim; d++) {
                acc[d] += vec[d];
            }
        }
        const n = tokenVectors.length;
        for (let d = 0; d < dim; d++) {
            acc[d] /= n;
        }
        return acc;
    }

    private normalizeBatchEmbeddingOutput(
        output: unknown,
        expectedBatch: number,
    ): number[][] {
        if (!Array.isArray(output) || output.length === 0) {
            throw new InternalServerErrorException(
                'Empty or invalid batch embedding response from HuggingFace',
            );
        }

        const rows: number[][] = [];

        for (const item of output as unknown[]) {
            if (typeof item === 'number') {
                throw new InternalServerErrorException(
                    'Unexpected scalar in batch embedding output',
                );
            }
            if (!Array.isArray(item)) {
                throw new InternalServerErrorException(
                    'Unexpected batch embedding element type',
                );
            }
            if (item.length === 0) {
                throw new InternalServerErrorException(
                    'Empty row in batch embedding output',
                );
            }
            if (typeof item[0] === 'number') {
                rows.push(item as number[]);
            } else if (Array.isArray(item[0])) {
                rows.push(this.meanPool(item as unknown as number[][]));
            } else {
                throw new InternalServerErrorException(
                    'Unexpected nested shape in batch embedding output',
                );
            }
        }

        if (rows.length !== expectedBatch) {
            this.logger.warn(
                `Batch embedding count ${rows.length} !== input ${expectedBatch}`,
            );
        }

        return rows;
    }

    /**
     * Chuyển đổi vai trò ChatMessageRole sang role của OpenAI SDK.
     */
    private toOpenAiChatRole(
        role: ChatMessageRole,
    ): 'system' | 'user' | 'assistant' {
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

    /**
     * Gọi chat completion qua OpenAI SDK trỏ vào HuggingFace router.
     * Hỗ trợ các model được host bởi Groq, Nebius,... thông qua HF router.
     */
    async chatCompletion(
        messages: IChatMessage[],
        systemPrompt: string,
    ): Promise<string> {
        const payload: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: this.toOpenAiChatRole(ChatMessageRole.SYSTEM),
                content: systemPrompt,
            },
            ...messages.map((m) => ({
                role: this.toOpenAiChatRole(m.role),
                content: m.content,
            })),
        ];

        try {
            const result = await this.openAiClient.chat.completions.create({
                model: this.chatModel,
                messages: payload,
                max_tokens: this.maxNewTokens,
                temperature: this.temperature,
            });

            return result.choices[0]?.message?.content ?? '';
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `HuggingFace chatCompletion failed [model=${this.chatModel}]: ${message}`,
            );
            throw new InternalServerErrorException(
                `Chat service error: ${message}`,
            );
        }
    }
}
