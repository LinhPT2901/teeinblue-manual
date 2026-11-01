# Template đo lường thời gian kiểm thử theo issue

Mục đích: đo xem một issue tốn bao lâu ở từng bước kiểm thử, phần nào là **làm**, phần nào là **chờ**, và hay bị block vì đâu. Mọi người ghi theo cùng một cách thì số liệu so sánh được với nhau và giữa các đợt.

Cách dùng: mỗi người ghi **một dòng cho mỗi lần bắt đầu và kết thúc một bước** (mục 2), ghi block khi gặp (mục 3). Cuối đợt, điền bảng tổng hợp (mục 4). Có thể chép các bảng sang Google Sheets để tính tự động (công thức ở mục 5).

---

## 1. Định nghĩa các bước

Ghi đúng tên bước dưới đây để gộp số liệu được.

**Bước làm** (thời gian mình hoặc AI đang thực sự làm):

| Mã bước | Bắt đầu khi | Kết thúc khi |
|---|---|---|
| `analysis` — Phân tích yêu cầu | Bắt đầu đọc ticket | Xong bản phân tích / danh sách câu hỏi |
| `testcase` — Viết test case | Bắt đầu viết | Test case đã lên Testlane (hoặc công cụ team dùng) |
| `data` — Dựng test data | Bắt đầu tạo data / môi trường | Data sẵn sàng để chạy |
| `preflight` — Kiểm môi trường trước khi chạy | Bắt đầu kiểm (login, bản build, config) | Môi trường đúng để chạy |
| `execute` — Chạy test | Case đầu tiên | Case cuối cùng của lượt (kể cả dừng sớm) |
| `report` — Báo cáo kết quả | Bắt đầu tổng hợp | Gửi báo cáo / cập nhật ticket xong — **issue xong** |

**Bước chờ** (không làm được gì cho phần đó, đang đợi người khác hoặc điều kiện):

| Mã chờ | Bắt đầu khi | Kết thúc khi |
|---|---|---|
| `wait-po-dev` — Chờ PO/Dev trả lời | Gửi câu hỏi | Nhận câu trả lời (ghi giờ trả lời thật, không phải giờ mình đọc) |
| `wait-deploy` — Chờ Dev deploy / sửa môi trường | Phát hiện bản fix chưa lên hoặc staging lỗi | Môi trường dùng được |
| `wait-action` — Chờ người khác làm tay | Nhờ (cấp quyền, đổi config, tạo account…) | Người đó báo xong |
| `wait-review` — Chờ review kết quả | Gửi kết quả cần duyệt | Được duyệt |

Quy ước:
- Một bước làm lại nhiều lần (vd chạy lại sau khi Dev fix) → ghi thêm một cặp bắt đầu/kết thúc mới, ghi lý do ở cột ghi chú. Thời gian được cộng dồn.
- Chờ và làm có thể **chồng nhau** (vừa chờ PO trả lời vừa dựng data cho phần không liên quan) → cứ ghi đúng thực tế, không cần trừ.
- Nghỉ, họp, làm việc khác không liên quan → không ghi. Nếu một bước bị ngắt quá 30 phút, kết thúc bước đó rồi mở lại sau.
- Thời gian ghi theo giờ máy, định dạng `YYYY-MM-DD HH:MM` (vd `2026-11-03 09:15`).

---

## 2. Nhật ký thời gian (mỗi dòng = một lần làm/chờ)

| Issue | Người test | Loại (làm/chờ) | Mã bước | Bắt đầu | Kết thúc | Thời lượng (phút) | Có dùng AI? | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| TIB-xxxx | | làm | analysis | 2026-11-03 09:00 | 2026-11-03 09:20 | 20 | có | |
| TIB-xxxx | | chờ | wait-po-dev | 2026-11-03 09:40 | 2026-11-03 14:05 | 265 | — | Q1, Q2 gửi PO |
| TIB-xxxx | | làm | execute | 2026-11-03 10:15 | 2026-11-03 11:30 | 75 | có | Lượt 1 |
| TIB-xxxx | | làm | execute | 2026-11-03 14:10 | 2026-11-03 14:35 | 25 | có | Lượt 2, sau khi PO trả lời Q1 |

Cột "Có dùng AI?": `có` / `một phần` / `không`, để so sánh bước nào AI giúp nhiều.

---

## 3. Nhật ký block

Ghi mỗi lần bị chặn, kể cả khi tự gỡ được.

| Issue | Ngày | Nhóm block | Mô tả ngắn | Bị chặn bao lâu (phút) | Tự gỡ được? | Cách gỡ / còn cần ai |
|---|---|---|---|---|---|---|
| TIB-xxxx | 2026-11-03 | Môi trường sau deploy | Không thêm được product base, lỗi GraphQL | 40 | có | Tạo qua API, báo Dev |

Nhóm block (chọn một):
1. **Môi trường sau deploy** — staging/dev lỗi, regression ở bước không phải thứ đang test.
2. **Thiếu AC / expected** — không biết kết quả mong đợi, phải chờ PO/Dev.
3. **Giới hạn môi trường** — tính năng không test được trên môi trường QA (dev store, thiếu tích hợp, thiếu quyền).
4. **WAF / rate limit / quota** — request bị chặn hoặc giới hạn.
5. **Phụ thuộc nền tảng ngoài** — Shopify, provider, dịch vụ bên thứ ba.
6. **Thiếu test data** — data đặc thù không có sẵn, khó tạo.
7. **Giới hạn công cụ** — công cụ test không làm được (giả lập mạng, đo timing…).
8. **Khác** — ghi rõ.

---

## 4. Tổng hợp cuối đợt

Đợt đo: từ `____` đến `____` · Người test: `____` · Số issue đã xong: `____`

**Thời gian mỗi issue** (chỉ tính issue đã có bước `report` kết thúc):

| Chỉ số | Trung bình | Trung vị | P75 | Số issue có bước này |
|---|---|---|---|---|
| **Tổng thời gian làm** | | | | |
| analysis | | | | |
| testcase | | | | |
| data | | | | |
| preflight | | | | |
| execute | | | | |
| report | | | | |
| **Tổng thời gian chờ** | | | | |
| wait-po-dev | | | | |
| wait-deploy | | | | |
| wait-action | | | | |
| wait-review | | | | |
| **Lịch** (bước đầu tiên → `report` kết thúc) | | | | |

- **Trung vị:** một nửa số issue nằm dưới mốc này, phản ánh issue "bình thường".
- **P75:** 75% số issue nằm dưới mốc này, phản ánh nhóm issue nặng.
- **Trung bình:** dễ bị kéo lên bởi vài issue rất nặng, nên đọc cùng trung vị.

**Block trong đợt:**

| Nhóm block | Số lần | Tổng phút bị chặn | Số lần tự gỡ được |
|---|---|---|---|
| Môi trường sau deploy | | | |
| Thiếu AC / expected | | | |
| Giới hạn môi trường | | | |
| WAF / rate limit / quota | | | |
| Phụ thuộc nền tảng ngoài | | | |
| Thiếu test data | | | |
| Giới hạn công cụ | | | |
| Khác | | | |

**Nhận xét (2–3 dòng):** bước nào tốn nhất, block nào lặp lại nhiều nhất, cần ai hỗ trợ gì.

---

## 5. Công thức Google Sheets (tuỳ chọn)

Chép bảng mục 2 vào một sheet tên `log`, cột theo đúng thứ tự trên (A = Issue … G = Thời lượng).

- Thời lượng (phút), ô G2: `=ROUND((F2-E2)*1440)`. Cột E, F định dạng ngày giờ.
- Tổng thời gian một bước của một issue: `=SUMIFS(log!G:G, log!A:A, "TIB-xxxx", log!D:D, "execute")`.
- Tổng thời gian làm của một issue: `=SUMIFS(log!G:G, log!A:A, "TIB-xxxx", log!C:C, "làm")`.
- Trên một sheet tổng hợp (mỗi dòng một issue, mỗi cột một bước):
  - Trung bình: `=AVERAGEIF(B2:B50, ">0")`
  - Trung vị: `=MEDIAN(FILTER(B2:B50, B2:B50>0))`
  - P75: `=PERCENTILE.INC(FILTER(B2:B50, B2:B50>0), 0.75)`

Bỏ các ô bằng 0 khi tính, để issue không có bước đó (vd không cần dựng data) không kéo số xuống.

---

## 6. Lưu ý để số liệu so sánh được

- Ghi **ngay lúc bắt đầu và kết thúc**, đừng ước lượng lại vào cuối ngày.
- Mỗi đợt nên có ít nhất 10–15 issue đã xong rồi mới so sánh. Ít hơn thì trung vị chưa ổn định.
- So sánh giữa các đợt bằng **trung vị và P75**, không chỉ trung bình.
- Issue bị huỷ hoặc chuyển người giữa chừng: ghi chú lại và không tính vào tổng hợp.
