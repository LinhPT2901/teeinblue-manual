# Internal Audit/Tracking Fields (không expose ra API)

Dùng rule này khi issue thêm một field/column **chỉ để tracking nội bộ** (nguồn gốc bản ghi, actor, timestamp hệ thống, audit trail…) và mô tả rõ field đó **không** xuất hiện trong API response / storefront / resource trả về merchant. Thường gặp trong epic "Security Enhancement" hoặc data-integrity cleanup.

## Context cần nhận diện

- Migration thêm cột mới (thường nullable, không backfill dữ liệu cũ).
- Có Observer/Listener enforce field bắt buộc phải set khi tạo mới (thường throw exception nếu thiếu) — đây là guard rail, không phải validation user-facing.
- Field không có trong `$visible`/API Resource/SDK payload — nghĩa là **QA không thể verify qua UI hay API thông thường**.
- Value thường là enum với nhiều "nguồn tạo" khác nhau (manual, bulk upload, clone, import…) map theo từng entry point trong code.

## Requirement cần kiểm tra

- **QA có cách nào verify không expose UI?** Đây gần như luôn là open question bắt buộc: cần DB read access, `tinker`/console access trên đúng environment, hay một endpoint nội bộ (internal-only, không phải public API) để đọc field này. Không tự giả định QA có quyền — phải hỏi.
- **Danh sách entry point tạo bản ghi đã đầy đủ chưa?** Dev thường liệt kê các call site đã sửa (controller, job, service…), nhưng cần hỏi rõ: còn path nào khác tạo bản ghi cùng loại không (seeder, admin script, import từ nguồn thứ 3, flow cũ chưa cover) — nếu có mà chưa update thì sẽ vỡ exception khi chạy, phải confirm đã cover hết trước khi test pass.
- **Environment đã có code chưa?** Field/observer thường đi kèm PR — kiểm tra PR đã merge & deploy lên đúng staging/environment QA test chưa trước khi bắt đầu (không tự suy đoán từ status Jira).
- **Hành vi khi thiếu field**: exception được throw ra sao — có làm crash flow tạo bản ghi (500/lỗi cho seller) hay chỉ log nội bộ? Nếu ảnh hưởng tới trải nghiệm seller thì mức độ risk tăng hẳn, cần test kỹ hơn là chỉ "audit tracking".
- **Dữ liệu cũ (pre-migration)**: cột mới thường nullable, không backfill — xác nhận các flow đọc/hiển thị dữ liệu cũ không bị crash khi field là `null`.

## Impacted Areas

- Toàn bộ entry point tạo bản ghi loại đó (không chỉ các entry point issue liệt kê).
- Observer/Listener enforce field.
- Bất kỳ API Resource/SDK payload nào serialize model đó — phải verify field KHÔNG lộ ra ngoài (âm tính — dễ bị bỏ qua vì "không thấy gì" trông giống pass).
- Regression suite cho các flow tạo bản ghi hiện có (dễ vỡ nhất vì guard rail là "throw nếu thiếu").

## Risks

- QA "PASS" nhầm vì không verify được field thật sự set đúng giá trị — chỉ verify UI không đổi, không đồng nghĩa field đúng ở DB.
- Bỏ sót một entry point cũ (không nằm trong danh sách dev liệt kê) → không phát hiện tới khi chạy production và bản ghi tạo qua path đó bị lỗi/crash.
- Test trên environment chưa có code (PR chưa merge/deploy) → kết luận sai.

## Open Questions thường phải hỏi

- QA verify field bằng cách nào (DB access, tinker, internal endpoint)? Ai cấp quyền?
- Danh sách entry point tạo bản ghi đã đầy đủ 100% chưa, hay còn path nào (seeder/admin tool/luồng cũ) chưa được liệt kê?
- PR đã merge & deploy lên environment nào QA đang test chưa?
- Khi thiếu field, exception có ảnh hưởng tới trải nghiệm người dùng cuối không, hay chỉ fail nội bộ (test/CI)?

## Suggested Test Focus

- Map từng entry point → giá trị enum kỳ vọng, test riêng từng flow.
- Regression toàn bộ flow tạo bản ghi hiện có (kể cả flow không trong danh sách issue liệt kê) để phát hiện path bị bỏ sót.
- Verify field KHÔNG xuất hiện ở mọi response công khai (API resource, storefront SDK, export).
- Verify dữ liệu cũ (field = null) vẫn hoạt động bình thường, không bị ép buộc/backfill ngoài ý muốn.
