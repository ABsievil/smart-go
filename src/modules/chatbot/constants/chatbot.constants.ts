// ─── Zilliz Collection Schema ─────────────────────────────────────────────────
export const ZILLIZ_FIELD_ID = 'id';
export const ZILLIZ_FIELD_EMBEDDING = 'embedding';
export const ZILLIZ_FIELD_TEXT = 'text';
export const ZILLIZ_FIELD_TYPE = 'type';
export const ZILLIZ_FIELD_METADATA = 'metadata';

export const ZILLIZ_VARCHAR_MAX_LENGTH = 65535;
export const ZILLIZ_ID_MAX_LENGTH = 64;
export const ZILLIZ_TYPE_MAX_LENGTH = 32;

// ─── Index & Search ───────────────────────────────────────────────────────────
export const ZILLIZ_INDEX_TYPE = 'AUTOINDEX';
export const ZILLIZ_METRIC_TYPE = 'COSINE';
export const ZILLIZ_INDEX_FIELD = 'embedding';

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const CHAT_MAX_HISTORY_TURNS = 10;

// ─── Timeout ──────────────────────────────────────────────────────────────────
export const EMBED_FILE_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút — batch embed nhiều items

// System prompt cơ bản — dùng khi không có context RAG
export const CHATBOT_SYSTEM_PROMPT =
    'You are Smart Go Assistant, an intelligent transit assistant for Ho Chi Minh City public transportation. ' +
    'Help users find bus routes, stations, schedules, and transit information. ' +
    'Be helpful, concise, and accurate.';

// System prompt đầy đủ kèm context RAG — thay {context} bằng tài liệu tìm được
export const CHATBOT_SYSTEM_PROMPT_WITH_CONTEXT =
    CHATBOT_SYSTEM_PROMPT +
    '\n\nRelevant context from knowledge base:\n{context}' +
    '\n\nUse the above context to provide accurate and helpful responses. ' +
    'If the context does not contain relevant information, answer based on your general knowledge.';
