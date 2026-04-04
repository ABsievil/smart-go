# Chatbot Module - Technical Description (RAG)

Module `chatbot` có nhiệm vụ cung cấp AI Assistant cho Smart Go theo hướng **Retrieval-Augmented Generation (RAG)**: nhúng tri thức vào **vector database**, truy xuất ngữ cảnh liên quan theo truy vấn của người dùng, sau đó ghép ngữ cảnh vào **system prompt** để mô hình sinh câu trả lời.

## 1. Mục tiêu & phạm vi

- Cung cấp API chat cho người dùng: `chat` (có hỗ trợ lịch sử hội thoại).
- Cung cấp API quản trị để nhúng tri thức vào vector DB:
  - `embed`: nhúng 1 đoạn văn bản
  - `embed/file`: nhúng hàng loạt từ file JSON
- Trả lời dựa trên kết quả tìm kiếm vector (RAG), tránh suy đoán khi không có dữ liệu phù hợp.

## 2. Kiến trúc tổng quan

Module được tổ chức theo mô hình `Controller/Service` trong **NestJS**:

- `ChatbotController`: định nghĩa endpoint HTTP, validate input (DTO), kiểm soát quyền (admin/user), và lưu hội thoại vào DB qua `MessageService`.
- `ChatbotService`: orchestrate luồng RAG:
  1. tạo embedding cho câu hỏi bằng `HuggingFaceService`
  2. search trong `ZillizService`
  3. ghép context vào system prompt
  4. gọi LLM để sinh câu trả lời
- `HuggingFaceService`:
  - Tạo embedding bằng **HuggingFace Inference SDK**.
  - Gọi chat completion bằng **OpenAI SDK**, nhưng trỏ vào **HuggingFace Router** (config `routerBaseUrl`) để sử dụng các model host qua HF router.
- `ZillizService`:
  - Kết nối **Zilliz / Milvus 2** để insert vector và search theo **cosine similarity**.
  - Tự đảm bảo collection/schema và load collection cho search.

## 3. Luồng xử lý `chat` (RAG)

Khi nhận request `POST /chatbot/chat`:

1. Xác định `conversationId`
   - Nếu client gửi `conversationId` thì server tải lịch sử tin nhắn từ DB.
   - Nếu chưa có, server tạo `conversationId` mới bằng `randomUUID()`.
2. Chuẩn hóa lịch sử hội thoại cho LLM
   - Lịch sử được cắt giới hạn số turn theo `CHAT_MAX_HISTORY_TURNS`.
   - Dùng util `messagesToChatHistoryItems` để map vai trò từ hệ thống sang role của chat model.
3. Embed câu hỏi
   - `ChatbotService.chat()` gọi `HuggingFaceService.generateEmbedding(message)`.
4. Truy xuất ngữ cảnh từ vector DB
   - `ZillizService.search(embedding, contextLimit)` trả về các đoạn văn bản + metadata và score.
5. Ghép ngữ cảnh vào system prompt
   - Nếu có kết quả: system prompt thay thế placeholder `{context}` bằng các “chunk” context.
   - Nếu không có kết quả: dùng system prompt không có context để hướng dẫn mô hình trả lời theo hướng “không có đủ dữ liệu”.
6. Gọi LLM sinh câu trả lời
   - `HuggingFaceService.chatCompletion(messages, enrichedSystemPrompt)`
   - Payload gồm: system prompt + danh sách message lịch sử (role/user/assistant).
7. Lưu hội thoại vào DB
   - Lưu message user và reply bot vào DB qua `MessageService.create(...)`.
8. Trả response
   - Trả `reply`, `conversationId` và `contextCount` (số lượng tài liệu được truy xuất).

## 4. Nhúng tri thức vào Vector DB

### 4.1 Endpoint `embed`

- `POST /chatbot/embed` (admin)
- Input: `EmbedRequestDto`
  - `text`: văn bản cần nhúng
  - `type`: loại tri thức (`route`, `station`, `faq`, `general`)
  - `metadata` (optional): metadata dạng object (ví dụ có thể chứa `routeCode`, `stationCode`, ...)
- Quy trình:
  1. tạo embedding từ `text`
  2. insert embedding + `text` + `type` + `metadata` vào Zilliz
  3. trả về `_id` và các trường liên quan

### 4.2 Endpoint `embed/file`

- `POST /chatbot/embed/file` (admin)
- Dùng upload file JSON (decorator upload, backend dùng `Multer` qua layer nội bộ).
- Parse file JSON thành mảng `EmbedRequestDto[]`.
- Nhúng tuần tự (không song song) để giảm nguy cơ bị rate-limit từ dịch vụ HuggingFace.
- Thời gian tối đa cho request được kiểm soát bởi `EMBED_FILE_TIMEOUT_MS` (~5 phút).

## 5. Schema & cấu hình trong Zilliz

`ZillizService` tạo collection (nếu chưa tồn tại) với các fields:

- `id`: primary key (VarChar)
- `embedding`: vector (FloatVector, dim = `chatbot.zilliz.dimension`)
- `text`: (VarChar) đoạn văn bản đã nhúng
- `type`: (VarChar) loại tri thức
- `metadata`: (JSON) thông tin chi tiết dạng key-value

Index/Search:
- Index type: `AUTOINDEX`
- Metric: `COSINE`

## 6. LLM Inference (HuggingFace Router qua OpenAI SDK)

`HuggingFaceService` sử dụng 2 SDK:

- `@huggingface/inference`:
  - `featureExtraction(...)` để tạo embedding.
- `openai`:
  - `chat.completions.create(...)` để gọi chat model.
  - Tuy nhiên `baseURL` trỏ vào `chatbot.huggingFace.routerBaseUrl`, nghĩa là request thực thi qua **HuggingFace Router** thay vì endpoint OpenAI gốc.

System prompt:
- Luôn cung cấp “system prompt core” về vai trò trợ lý Smart Go.
- Khi có context: thay `{context}` bằng chuỗi các chunk truy xuất (kèm metadata dạng JSON nếu có).
- Khi không có context: prompt hướng mô hình trả lời theo hướng không bịa đặt và gợi ý người dùng kiểm tra nguồn/đầu mối phù hợp.

## 7. API Endpoints (tóm tắt)

- `POST /chatbot/chat`
  - Bearer auth
  - Input: `ChatRequestDto` (`message`, `conversationId?`)
  - Output: `ChatResponseDto` (`reply`, `conversationId`, `contextCount?`)
  - Có hỗ trợ tải lịch sử hội thoại từ DB.

- `POST /chatbot/embed`
  - Bearer auth + `ADMIN` role
  - Input: `EmbedRequestDto` (`text`, `type`, `metadata?`)
  - Output: `EmbedGetResponseDto` (text/type; dạng BaseResponseDto)

- `POST /chatbot/embed/file`
  - Bearer auth + `ADMIN` role
  - Upload file JSON mảng `EmbedRequestDto[]`
  - Output: `EmbedListResponseDto` (danh sách kết quả)

## 8. Framework/Thư viện sử dụng

Backend / kiến trúc:
- `@nestjs/common`, `@nestjs/config` (NestJS DI + cấu hình)
- `@nestjs/swagger` (Swagger decorators cho tài liệu API)

Validation & serialization:
- `class-validator` (validate request DTO)
- `class-transformer` (`@Expose()` cho response)

Vector DB & embedding:
- `@huggingface/inference` (embedding via HF Inference SDK)
- `@zilliz/milvus2-sdk-node` (insert/search trên Zilliz/Milvus 2)

LLM client:
- `openai` (chat completion SDK, nhưng target HF Router qua `baseURL`)

Khác:
- `node:crypto` (`randomUUID`)
- Upload file: layer decorator nội bộ dùng `Express.Multer.File` (Multer)
- Decorator & guard nội bộ: `CurrentUser`, `Roles`, `UserRole`, `LanguageResponse`, `RequestTimeout`, ...

## 9. Có dùng `langchain` không?

Trong module `chatbot` hiện tại **không thấy sử dụng `langchain`/LangChain orchestration**. Luồng RAG được triển khai trực tiếp bằng logic thuần backend: embed (HF), search (Zilliz), ghép context vào prompt, và gọi LLM (qua HF Router).

## 10. Gợi ý sử dụng trong báo cáo đồ án

Bạn có thể trích các ý sau (đúng theo code):
- “RAG workflow”: Embed -> Vector search -> Context injection -> LLM chat completion
- “Vector schema”: fields `id/embedding/text/type/metadata`, index COSINE
- “LLM routing”: gọi chat model thông qua **OpenAI SDK** nhưng trỏ tới **HuggingFace Router**
- “Admin knowledge ingestion”: `embed` và `embed/file` (sequential batching)

