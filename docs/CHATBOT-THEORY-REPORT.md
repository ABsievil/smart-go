# Chatbot thông minh dựa trên RAG: Mô hình lý thuyết và phương pháp trình bày
## 1. Đặt vấn đề

Trong bài toán trợ lý hỏi-đáp cho giao thông công cộng, hệ thống thường phải:

- Trả lời câu hỏi ngôn ngữ tự nhiên (NLP) với độ trôi chảy cao.
- Không “bịa” thông tin (hallucination) khi tri thức cần thiết không có trong hệ thống.
- Biết trả lời theo bối cảnh hội thoại nhiều lượt (multi-turn dialogue).
- Có khả năng mở rộng nguồn tri thức theo dạng dữ liệu có cấu trúc hoặc bán cấu trúc (ví dụ tuyến, trạm, FAQ).

Các mô hình ngôn ngữ lớn (LLM) có khả năng sinh văn bản tốt nhưng lại không đảm bảo việc nội dung sinh ra luôn khớp với tri thức mới/đúng. Do đó, RAG được xem như một cách tiếp cận thực dụng: **truy xuất tài liệu liên quan** từ kho tri thức ngoài, sau đó **kích hoạt LLM để sinh câu trả lời có căn cứ** từ các đoạn ngữ cảnh đó.

## 2. Nền tảng lý thuyết: Retrieval-Augmented Generation

### 2.1. Tư tưởng cốt lõi

RAG thường được mô tả như một bài toán sinh có điều kiện theo ngữ cảnh:

- Cho câu hỏi người dùng $q$.
- Thực hiện truy xuất các đoạn tri thức $C = \\{c_1, c_2, ..., c_k\\}$ liên quan.
- Ghép $C$ vào prompt (thường là system prompt + nội dung ngữ cảnh).
- Sinh câu trả lời $y$ từ LLM:
  - $y \\sim p(y \\mid q, C)$

So với “chỉ dùng LLM”:

- LLM được “chỉ dẫn dữ kiện” từ kho tri thức.
- Xác suất trả lời đúng tăng lên khi $C$ chứa đủ thông tin.
- Có thể thiết kế cơ chế để khi $C$ rỗng hoặc không đủ, hệ thống trả lời theo hướng “không có đủ dữ liệu” thay vì suy đoán.

### 2.2. Hai tầng chính của RAG

RAG có thể xem như gồm 2 tầng:

1. **Tầng truy xuất (Retrieval)**  
   Chuyển đổi câu hỏi sang không gian vector thông qua embedding, sau đó tìm các vectơ gần nhất trong kho tri thức (vector search) để lấy $k$ chunk liên quan.

2. **Tầng sinh (Generation)**  
   Tạo prompt có chứa các chunk truy xuất, sau đó dùng LLM sinh câu trả lời.

Trong thực nghiệm, chất lượng cuối cùng thường phụ thuộc mạnh vào:

- Chất lượng embedding (khả năng biểu diễn ngữ nghĩa).
- Chiến lược truy xuất (top-k, ngưỡng, loại bỏ nhiễu).
- Cách nhét ngữ cảnh vào prompt (prompt template, ưu tiên, hướng dẫn chống bịa đặt).
- Chiến lược quản lý lịch sử hội thoại và giới hạn ngữ cảnh (token budget).

## 3. Biểu diễn ngữ nghĩa bằng Embeddings

### 3.1. Vì sao cần embedding?

Trong truy xuất RAG, ta cần đo “mức độ liên quan ngữ nghĩa” giữa câu hỏi $q$ và các mẩu tri thức. Thay vì dùng từ khóa (keyword matching), embedding giúp ánh xạ văn bản vào không gian vectơ mà khoảng cách phản ánh độ tương đồng ngữ nghĩa.

Formally, nếu $f(\\cdot)$ là hàm embedding, ta có:

- $v_q = f(q)$
- $v_{c_i} = f(c_i)$

### 3.2. Metric tương đồng và ý nghĩa cosine

Trong thực hành, truy xuất gần nhất thường dùng metric như **cosine similarity**. Cosine similarity xem vectơ như “hướng ngữ nghĩa” thay vì độ lớn, phù hợp khi embedding đã được huấn luyện/chuẩn hoá theo cách mà độ lớn không quá quan trọng.

Với $v_q$ và $v_{c}$:

- $\\text{cos}(v_q, v_c) = \\frac{v_q \\cdot v_c}{||v_q||\\,||v_c||}$

Kết quả top-k theo cosine thường cho chất lượng truy xuất tốt với đa dạng câu hỏi miễn là embedding model có năng lực ngữ nghĩa tổng quát.

## 4. Kho tri thức dạng Vector Database

### 4.1. Mô hình hoá dữ liệu tri thức

Tri thức đầu vào có thể được biểu diễn thành nhiều “chunk” (mẩu văn bản nhỏ) cùng với nhãn và metadata. Metadata có thể chứa:

- loại tri thức (tuyến, trạm, FAQ, general)
- mã tuyến/trạm
- các thuộc tính hỗ trợ truy vết/diễn giải

Về bản chất, mỗi record trong kho vector thường có dạng:

- `id`: định danh
- `embedding`: vectơ biểu diễn
- `text`: nội dung chunk
- `type`: nhãn phân loại
- `metadata`: thông tin bổ sung

### 4.2. Vai trò của Index & Search

Trong vector DB, index giúp tăng tốc độ truy xuất. Với quy mô tri thức lớn, tìm kiếm tuyến tính (so sánh mọi vector) là tốn kém, do đó các kỹ thuật index/ANN (Approximate Nearest Neighbors) thường được dùng.

Trong bối cảnh RAG, ta cần cân bằng:

- **Độ phủ (recall)**: top-k phải chứa chunk đúng.
- **Tốc độ (latency)**: thời gian truy xuất ảnh hưởng trực tiếp UX.

Vì RAG có tính “online inference”, thiết kế index và schema là phần quan trọng trong hệ thống thực nghiệm.

## 5. Prompt engineering cho RAG và chống hallucination

### 5.1. System prompt như một “ràng buộc hành vi”

Một điểm quan trọng của chatbot RAG là kiểm soát hành vi sinh văn bản. Thay vì chỉ nhét ngữ cảnh, hệ thống thường dùng system prompt để:

- Xác định vai trò trợ lý (domain knowledge giao thông công cộng).
- Định nghĩa phạm vi nhiệm vụ (hỏi tuyến/trạm/giá vé/thông tin liên quan).
- Đưa ra quy tắc sử dụng context:
  - ưu tiên thông tin trong các chunk truy xuất
  - nếu thiếu dữ liệu trong context thì không được tự suy đoán

Về mặt thiết kế, prompt thường có 2 chế độ:

- **Chế độ có context**: prompt kèm phần ngữ cảnh `{context}`.
- **Chế độ không context**: prompt chỉ dẫn trả lời theo hướng “không đủ dữ liệu trong hệ thống”.

Cách này làm giảm rủi ro LLM tạo ra câu trả lời không căn cứ khi truy xuất thất bại.

### 5.2. Chèn context theo thứ tự & kèm metadata (nếu có)

Context có thể được trình bày dưới dạng các chunk đánh số thứ tự. Nếu metadata cấu trúc có giá trị, hệ thống có thể nhúng metadata dưới dạng JSON “đọc được” để LLM có thêm tín hiệu.

Điều quan trọng về lý thuyết là:

- LLM hoạt động theo token input: thứ tự, định dạng và độ “dễ đọc” giúp tăng khả năng trích đúng thông tin.
- Đưa metadata giúp tăng tính “có nguồn” cho các trường hợp câu hỏi yêu cầu chi tiết (mã tuyến, thuộc tính trạm, v.v.).

## 6. Memory trong hội thoại nhiều lượt

### 6.1. Bài toán multi-turn dialogue

Chatbot trong thực tế thường cần theo dõi bối cảnh. Nếu chỉ dựa vào câu hỏi hiện tại, hệ thống có thể hiểu sai do câu hỏi thường là dạng tham chiếu (“tuyến đó”, “trạm đó”, “giá vé bao nhiêu cho lượt trước đó”…).

Giải pháp phổ biến trong RAG là:

- Lưu lịch sử message.
- Khi sinh câu trả lời mới, đưa một phần lịch sử vào prompt.

### 6.2. Giới hạn số lượt (token budget trade-off)

Tuy nhiên, lịch sử quá dài làm prompt phình to, dẫn tới:

- tốn chi phí suy luận
- tăng độ trễ
- vượt giới hạn context window của mô hình

Do đó, hệ thống thường áp dụng “truncation theo số lượt gần nhất”:

- chỉ giữ `N` turn cuối
- loại bỏ các turn quá cũ

Đây là sự đánh đổi giữa:

- độ đầy đủ thông tin hội thoại
- chi phí tính toán và giới hạn mô hình

## 7. Kiến thức ingestion: từ dữ liệu gốc đến chunk vector

Trong RAG, chất lượng retrieval phụ thuộc mạnh vào quá trình chuẩn hoá dữ liệu đầu vào. Ở mức lý thuyết, ingestion bao gồm:

1. **Chuẩn hoá/chuẩn bị nội dung**  
   Tách dữ liệu thành chunk phù hợp (không quá dài, không quá ngắn), gắn nhãn loại tri thức và metadata.

2. **Tạo embedding**  
   Ánh xạ từng chunk thành vector bằng embedding model.

3. **Lưu trữ vào vector DB**  
   Insert record có embedding + text + metadata.

4. **Cập nhật**  
   Khi có dữ liệu mới/cập nhật, cần cơ chế cập nhật (insert mới hoặc cập nhật theo id).

## 8. Thiết kế phương pháp đánh giá (đề xuất cho luận văn)

Để bài viết có tính khoa học, nên có phần đánh giá rõ ràng. Có thể chia thành 2 nhóm:

### 8.1. Đánh giá truy xuất (Retrieval quality)

- `Recall@k`: tỉ lệ câu hỏi mà chunk đúng nằm trong top-k.
- `Mean Similarity Score` hoặc phân phối score: theo dõi độ “tự tin” truy xuất.
- Phân tích theo loại tri thức (`route`, `station`, `faq`, `general`) để xem tri thức nào truy xuất tốt hơn.

### 8.2. Đánh giá sinh câu trả lời (Generation quality)

- Faithfulness / groundedness: câu trả lời có bám vào context hay không.
- Hallucination rate: tỉ lệ câu trả lời có suy đoán khi context không có thông tin.
- Human evaluation: điểm theo thang 1-5 về độ chính xác, mức độ phù hợp, và tính hữu ích.

### 8.3. Ablation study (khuyến nghị)

Trong đánh giá chatbot RAG, **ablation study** được dùng để lượng hóa đóng góp của từng thành phần bằng cách so sánh hiệu năng giữa nhiều cấu hình. Có thể thử `LLM-only` (không retrieval), `RAG-no-metadata` (chỉ dùng `text`), `RAG-full` (dùng cả `metadata`), và điều chỉnh số chunk truy xuất `k`. Nếu các biến thể RAG tốt hơn nhất quán so với `LLM-only` và `RAG-full` tốt hơn `RAG-no-metadata`, có thể kết luận rằng truy xuất ngữ cảnh (kèm metadata) giúp tăng groundedness và giảm hallucination.

## 9. Kết luận

Chatbot theo hướng RAG là một chiến lược kết hợp giữa:

- khả năng sinh ngôn ngữ của LLM
- khả năng truy xuất tri thức theo ngữ nghĩa bằng embedding và vector search

Về mặt lý thuyết, hiệu quả của hệ thống phụ thuộc vào pipeline embedding–retrieval–context injection–generation, đồng thời cần có cơ chế prompt để đảm bảo mô hình không bịa đặt khi không có đủ dữ liệu. Đây là nền tảng phù hợp để xây dựng trợ lý hỏi-đáp trong miền tri thức cụ thể (giao thông công cộng), đồng thời dễ mở rộng khi kho tri thức được cập nhật.

