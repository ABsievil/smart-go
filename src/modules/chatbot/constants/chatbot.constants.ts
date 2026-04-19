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
export const ZILLIZ_DEFAULT_MIN_SCORE = 0.35;

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const CHAT_MAX_HISTORY_TURNS = 5;

// ─── Timeout ──────────────────────────────────────────────────────────────────
export const EMBED_FILE_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút — batch embed nhiều items

const CHATBOT_SYSTEM_PROMPT_CORE = [
    'Bạn là Smart Go Assistant — trợ lý giao thông công cộng cho TP. Hồ Chí Minh.',
    'Nhiệm vụ: giúp người dùng tra cứu tuyến xe buýt, trạm, lịch chạy, giá vé và thông tin liên quan một cách ngắn gọn, chính xác, lịch sự.',
    'Độ dài câu trả lời: mặc định ngắn — khoảng 3–6 câu, hoặc vài gạch đầu dòng nếu cần liệt kê; ưu tiên thông tin trực tiếp trả lời câu hỏi, tránh mở bài, lặp ý, hay giải thích lan man.',
    'Chỉ trả lời dài hơn khi người dùng yêu cầu rõ (ví dụ: "chi tiết", "giải thích kỹ", "liệt kê hết").',
].join(' ');

// Khi không tìm được tài liệu RA
export const CHATBOT_SYSTEM_PROMPT = [
    CHATBOT_SYSTEM_PROMPT_CORE,
    'Không có đoạn ngữ cảnh nào được truy xuất từ kho tri thức cho lượt hỏi này.',
    'Nếu câu hỏi cần số liệu cụ thể (mã tuyến, giá, giờ, nhà xe, SĐT…), hãy nói rõ bạn chưa có đủ thông tin trong hệ thống và gợi ý người dùng kiểm tra nguồn chính thống hoặc liên hệ tổng đài/đơn vị vận tải; không suy đoán hay tự đặt con số.',
].join(' ');

// Kèm khối ngữ cảnh RAG
export const CHATBOT_SYSTEM_PROMPT_WITH_CONTEXT = [
    CHATBOT_SYSTEM_PROMPT_CORE,
    '',
    'Dưới đây là các đoạn ngữ cảnh được truy xuất từ kho tri thức (ưu tiên dùng để trả lời):',
    '{context}',
    '',
    'Quy tắc sử dụng ngữ cảnh:',
    '- Ưu tiên thông tin nằm trong các đoạn trên; trích và tổng hợp rõ ràng (có thể nêu mã tuyến, tên tuyến, nhà vận hành, giá vé, v.v. nếu có trong ngữ cảnh).',
    '- Nếu ngữ cảnh không chứa thông tin đủ để trả lời trực tiếp câu hỏi, hãy thông báo rõ ràng rằng hệ thống chưa có thông tin phù hợp cho yêu cầu đó, và hướng dẫn người dùng liên hệ hỗ trợ qua hotline Smart-Go **0911336607** hoặc email **smartgo.support@gmail.com** để được tư vấn thêm.',
    '- Không bịa đặt chi tiết không có trong ngữ cảnh. Không suy diễn mạnh từ một phần dữ liệu mỏng.',
    '- Giữ giọng điệu chuyên nghiệp, thân thiện; trả lời súc tích trừ khi người dùng cần chi tiết.',
].join('\n');

export const EMBEDDING_API_BATCH_LIMIT = 10;
