import { registerAs } from '@nestjs/config';

export default registerAs(
    'chatbot',
    (): Record<string, any> => ({
        dashscope: {
            apiKey: process.env.DASHSCOPE_API_KEY ?? '',
            baseURL:
                process.env.DASHSCOPE_BASE_URL ??
                'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
            chatModel: process.env.DASHSCOPE_CHAT_MODEL ?? 'qwen3.5-35b-a3b',
            embeddingModel:
                process.env.DASHSCOPE_EMBEDDING_MODEL ?? 'text-embedding-v4',
            embeddingDimension: Number(
                process.env.DASHSCOPE_EMBEDDING_DIMENSION ?? 1536,
            ),
            maxNewTokens: Number(process.env.DASHSCOPE_MAX_NEW_TOKENS ?? 1024),
            temperature: Number(process.env.DASHSCOPE_TEMPERATURE ?? 0.7),
            enableThinking:
                (process.env.DASHSCOPE_ENABLE_THINKING ?? 'false') === 'true',
        },
        zilliz: {
            uri: process.env.ZILLIZ_URI ?? '',
            token: process.env.ZILLIZ_TOKEN ?? '',
            collectionName:
                process.env.ZILLIZ_COLLECTION_NAME ?? 'smart_go_knowledge',
            dimension: Number(process.env.ZILLIZ_DIMENSION ?? 1536),
            minScore: Number(process.env.ZILLIZ_MIN_SCORE ?? 0.35),
        },
        contextLimit: Number(process.env.CHATBOT_CONTEXT_LIMIT ?? 5),
        embedFileBatchSize: Math.min(
            256,
            Math.max(1, Number(process.env.CHATBOT_EMBED_BATCH_SIZE ?? 64)),
        ),
    }),
);
