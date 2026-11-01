# Báo cáo QA teeinblue — thời gian, quy trình, AI và điểm nghẽn

Ngày: 01/11/2026 · Phạm vi số liệu: 61 issue, 24/09 → 31/10/2026

## 1. Tóm tắt

Mỗi issue teeinblue mất trung vị **1 giờ 29 phút làm việc** (trung bình 1 giờ 56 phút). Thời gian chờ và gián đoạn trong phiên còn gấp đôi con số đó (trung vị 2 giờ 58 phút).

- **Thời gian:** execute và dựng test data chiếm phần lớn thời gian làm. Phân tích yêu cầu và viết test case chỉ mất khoảng 10–15 phút mỗi issue, nhờ AI.
- **Quy trình:** AI chạy 4 bước (phân tích → test case → test data → execute). Người chỉ review ở 2 điểm: duyệt câu hỏi gửi PO/Dev, và đọc báo cáo kết quả.
- **Điểm nghẽn chính:**
  - Staging lỗi sau deploy.
  - Thiếu AC/expected result.
  - Môi trường staging bị giới hạn (dev store, thiếu tích hợp).
  - WAF và rate limit chặn thao tác test.
- **Đã cải thiện (31/10–01/11):**
  - AI tự phục hồi những lỗi đã gặp trước đây.
  - Một case lỗi không làm dừng cả lượt test.
  - Câu hỏi và việc cần làm tay được gom vào một lần.
  - Chạy song song tối đa 3 issue.
  - Đo thời gian chính xác theo từng bước.
- **Cần hỗ trợ:**
  - Smoke test staging sau mỗi lần deploy.
  - AC/expected result rõ hơn.
  - Thông tin quota upload.
  - Whitelist WAF cho payload test bảo mật.
  - Một store test không phải dev store.

## 2. Thời gian kiểm thử

Trong thời gian làm, execute chiếm nhiều nhất, sau đó là dựng test data. Thời gian chờ còn lớn hơn cả tổng thời gian làm.

| Chỉ số mỗi issue | Trung bình | Trung vị | P75 |
|---|---|---|---|
| **Tổng thời gian làm** | **1h56** | **1h29** | 2h29 |
| Phân tích yêu cầu | 9 phút | 6 phút | 10 phút |
| Viết test case | 7 phút | 4 phút | 10 phút |
| Dựng test data | 36 phút | 30 phút | 47 phút |
| Execute | 1h15 | 52 phút | 1h40 |
| Thời gian lặng trong phiên (chờ PO/Dev, chờ thao tác tay, nghỉ) | 3h56 | 2h58 | 5h20 |
| Số phiên làm việc | 2,1 | 2 | — |
| Số ngày có làm | 2,2 | 2 | — |

P75 là mốc mà 75% số issue làm xong trong khoảng đó. Cột này cho biết nhóm issue nặng tốn bao lâu.

Ba issue tốn nhiều thời gian nhất là TIB-5516 (8h13), TIB-5526 (6h07) và TIB-5591 (5h06). Đây đều là issue nhiều vòng: phải chờ PO/Dev trả lời, hoặc dựng lại data rồi chạy lại.

**Giới hạn số liệu:** đây là ước lượng từ log phiên làm việc với AI, chưa phải số đo trực tiếp.
- Không tách được chờ PO/Dev với chờ thao tác tay hay nghỉ.
- Thời gian test tay ngoài AI không có trong số liệu.
- Khi một phiên làm nhiều issue xen kẽ, thời gian có thể bị gán nhầm issue.

**Đo tiếp:** từ 01/11, mỗi bước của mỗi issue được ghi mốc bắt đầu và kết thúc. Thời gian chờ được tách riêng theo loại: chờ PO/Dev, chờ thao tác tay, chờ deploy, chờ review. Khi có khoảng 10–15 issue mới, sẽ so sánh với bảng trên bằng cùng một cách tính.

## 3. Quy trình kiểm thử

Mỗi issue đi qua 6 bước. Người chỉ phải dừng lại ở 2 điểm review:

1. **Phân tích yêu cầu.** AI đọc ticket và comment trên Jira, rồi tự trả lời các điểm chưa rõ trước khi hỏi. Thứ tự tra: ticket/comment → bộ quy tắc nghiệp vụ đã xác nhận → kiểm tra hành vi thực tế trên staging (chỉ đọc) → tính năng tương tự đã có.
2. **Review 1: câu hỏi cho PO/Dev.** Chỉ hỏi những câu tra hết các nguồn trên mà vẫn chưa trả lời được, và đáp án làm đổi scope, cách setup hoặc kết quả mong đợi. Mỗi câu kèm đáp án đề xuất để PO chỉ cần trả lời đúng/sai. QA tự quyết gửi câu nào, gửi qua đâu; AI không tự gửi. Issue đủ rõ thì tự qua bước này.
3. **Viết test case.** Mỗi case phải truy được về một business rule, một khu vực bị ảnh hưởng, hoặc một rủi ro trong bản phân tích. Case ngoài scope bị loại. Case chưa có expected được xác nhận vẫn chạy, chỉ ghi lại hành vi thực tế. Case môi trường không chạy được thì được đánh dấu ngay từ đầu.
4. **Dựng test data.** Bước tạo data không phải thứ đang test thì dựng qua API/MCP cho nhanh. Case cần kiểm chính luồng giao diện thì dựng qua giao diện. Data đặc thù (account, store đặc biệt) được dùng lại từ danh mục có sẵn.
5. **Execute.** Trước khi chạy, AI kiểm môi trường một lượt và gom mọi việc cần người làm tay (login, đổi config store, xác nhận deploy) vào một lần nhờ. Gặp lỗi thì ghi lại rồi chạy tiếp các case không liên quan, không dừng cả lượt.
6. **Review 2: báo cáo kết quả.** Gồm số case pass/fail, bug quan sát được (QA quyết định có log hay không), các case cần nhìn bằng mắt kèm ảnh so sánh preview với design, và lỗi staging cần báo Dev.

Nhiều issue có thể chạy cùng lúc, tối đa 3. Khi thay đổi cấu hình dùng chung (setting store, account), phải giữ quyền trước, nên hai issue không làm sai điều kiện test của nhau.

## 4. AI trong quy trình

| Bước | AI làm | Người làm |
|---|---|---|
| Phân tích | Đọc ticket và comment, tự trả lời từ các nguồn đã xác nhận, liệt kê business rule, khu vực ảnh hưởng, rủi ro, câu hỏi kèm đáp án đề xuất | Duyệt câu hỏi, gửi PO/Dev, chuyển câu trả lời lại cho AI |
| Test case | Sinh case bám scope, tạo thẳng lên Testlane, gắn nhãn case chưa có expected xác nhận / case môi trường không chạy được | Xem nhanh lô case (khi cần) |
| Test data | Dựng campaign, artwork, layer trên staging qua MCP hoặc giao diện; tạo Postman collection cho issue nặng về API | Làm các thao tác cần quyền riêng (2FA, đổi config store) khi được nhờ |
| Execute | Chạy test trên browser thật (Playwright), ghi kết quả và bằng chứng lên Testlane, chụp ảnh khi fail, giả lập mạng chậm hoặc lỗi 429/500 khi case cần | Nhìn ảnh so sánh render, quyết định log bug |
| Báo cáo | Tổng hợp kết quả, lỗi staging, dữ liệu đã tạo, thời gian từng bước | Đọc, chuyển cho Dev/PO |

**Rào chắn chất lượng:**
- AI chỉ kết luận pass khi đã kiểm đủ mọi vế của expected result.
- Không suy luận để lấp chỗ trống, nhất là với case bảo mật.
- Không tự tạo bug, không sửa hay comment trên Jira.
- Đường vòng chỉ được dùng để chuẩn bị điều kiện. Nếu lỗi nằm trong chính luồng đang test thì ghi nhận lỗi, không dùng đường khác để kết luận pass.
- Không xoá test data sau khi chạy, để Dev xem lại khi có lỗi.
- Thay đổi tạm thời (giả lập mạng chậm, giả lỗi, config dùng chung) luôn được khôi phục và kiểm lại sau mỗi lượt.

**Tự học:**
- Mỗi lỗi môi trường đã tự xử lý được ghi thành một bài học: dấu hiệu, nguyên nhân, cách xử lý, giới hạn áp dụng, ngày xác minh. Lần sau gặp lại, AI tự xử lý và dẫn bằng chứng thay vì hỏi lại.
- Hành vi sản phẩm đã được PO/Dev xác nhận được gom vào bộ quy tắc nghiệp vụ dùng chung. Quan sát mới chưa xác nhận thì không tự trở thành quy tắc.

## 5. Những thứ hay bị block

| Nhóm | Ví dụ thực tế | Hiện xử lý thế nào | Còn cần |
|---|---|---|---|
| **Staging lỗi sau deploy** | Không thêm được product base vào campaign: lỗi GraphQL `preview_thumbnail`, gặp ngày 23/08, tái phát ngày 23/10 (TIB-5539) | Nếu lỗi chỉ cản bước setup thì dựng data qua API/MCP và báo Dev; nếu lỗi nằm trong luồng đang test thì ghi nhận lỗi | Dev chạy smoke test luồng tạo campaign sau mỗi lần deploy |
| **Thiếu AC / expected result** | Nhiều case phải chờ PO/Dev xác nhận hành vi; có lần expected viết sai theo mô tả ticket (TIB-5534, TIB-5538) | Tự tra quy tắc đã xác nhận trước; câu còn lại hỏi một lần, kèm đáp án đề xuất; case chưa xác nhận vẫn chạy để ghi hành vi thực tế | PO bổ sung AC/expected trong ticket (đã đề nghị) |
| **Giới hạn môi trường staging** | Dev store không tạo được test design; provider không trả tracking (TIB-5439); không có token Printify; không kết nối được Strava; không truy cập Horizon | Đánh dấu ngay từ lúc viết test case; vế không kiểm được thì bỏ, case vẫn chạy phần còn lại | Một store test không phải dev store; quyền xem Horizon (nếu cần) |
| **WAF / rate limit** | Upload SVG có `<script>` bị Cloudflare chặn (TIB-5278); quota tạo layer-image trả 429 kéo dài hơn 20 phút (TIB-5425) | Dùng biến thể payload qua được WAF khi case cho phép; ước lượng trước số request cần dùng | Whitelist WAF cho payload test bảo mật; thông tin quota cụ thể |
| **Phụ thuộc Shopify** | Product chưa bật kênh Online Store nên storefront 404 (TIB-5349); Shopify MCP không với tới store mới | AI tự đăng nhập Shopify admin qua browser để làm | — |
| **Data đặc thù khó tìm** | Product base giá 0đ, campaign artwork đời cũ (TIB-5482) | Lưu danh mục data đặc thù để dùng lại; ghi rõ đã tìm ở đâu | Dev cung cấp ID hoặc seed data khi cần |
| **Giới hạn công cụ** | Giả lập mạng chậm, ép lỗi 429/500, đo timing mạng | Đã có cách giả lập mạng chậm và ép lỗi (đã kiểm chứng); timing mạng chỉ tin số đo trên Chrome thật | — |

Theo ghi chép, 3 điểm gây mất thời gian nhất là staging lỗi sau deploy, rate limit upload, và chờ PO/Dev xác nhận expected.

## 6. Đề xuất và cần hỗ trợ

| Đề xuất | Cho ai | Lợi ích |
|---|---|---|
| Smoke test luồng chính (tạo campaign → thêm product base → gắn artwork → publish) sau mỗi lần deploy staging | Dev | Phát hiện regression trước khi QA bắt đầu, tránh mất cả lượt test |
| AC/expected result ghi rõ trong ticket trước khi chuyển QA | PO | Giảm câu hỏi chặn ở Review 1 và số case phải chờ xác nhận |
| Công bố quota upload/rate limit của staging | Dev | Lập kế hoạch dựng data, không bị chặn giữa chừng |
| Whitelist WAF (theo IP hoặc header) cho payload test bảo mật | Dev / DevOps | Chạy được đúng payload trong case bảo mật, không phải thay bằng biến thể |
| Một store test không phải dev store | Quản lý / Dev | Test được test design và các tính năng bị khoá trên dev store |

**Mốc đo tiếp theo:** sau khoảng 10–15 issue chạy theo quy trình mới, so sánh trung vị và P75 của thời gian làm và thời gian chờ với bảng ở mục 2. Mục tiêu chính là giảm thời gian chờ, và giảm P75 của nhóm issue nặng.
