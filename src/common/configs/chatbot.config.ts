import { registerAs } from '@nestjs/config';

export default registerAs(
    'chatbot',
    (): Record<string, any> => ({
        huggingFace: {
            token: process.env.HF_TOKEN ?? '',
            chatModel:
                process.env.HF_CHAT_MODEL ??
                'moonshotai/Kimi-K2-Instruct-0905:groq',
            embeddingModel:
                process.env.HF_EMBEDDING_MODEL ??
                'sentence-transformers/all-MiniLM-L6-v2',
            maxNewTokens: Number(process.env.HF_MAX_NEW_TOKENS ?? 512),
            temperature: Number(process.env.HF_TEMPERATURE ?? 0.7),
            inferenceProvider:
                process.env.HF_INFERENCE_PROVIDER ?? 'hf-inference',
            routerBaseUrl:
                process.env.HF_ROUTER_BASE_URL ??
                'https://router.huggingface.co/v1',
        },
        zilliz: {
            uri: process.env.ZILLIZ_URI ?? '',
            token: process.env.ZILLIZ_TOKEN ?? '',
            collectionName:
                process.env.ZILLIZ_COLLECTION_NAME ?? 'smart_go_knowledge',
            dimension: Number(process.env.ZILLIZ_DIMENSION ?? 384),
        },
        contextLimit: Number(process.env.CHATBOT_CONTEXT_LIMIT ?? 5),
        /** Số item gộp mỗi lần gọi HF feature-extraction + một lần insert Zilliz (tối ưu bulk). */
        embedFileBatchSize: Math.min(
            256,
            Math.max(1, Number(process.env.CHATBOT_EMBED_BATCH_SIZE ?? 64)),
        ),
    }),
);
