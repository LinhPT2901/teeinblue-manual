# TIB Test Data Ledger — đã tách theo issue (2026-10-31)

Ledger giờ là **mỗi issue một file**: `runs/<KEY>/ledger.md` (cùng thư mục state của `qa-issue-run`). Tách ra để nhiều lượt chạy song song không ghi đè cùng một file.

- Ghi data mới của issue nào vào `runs/<KEY>/ledger.md` của issue đó (tạo file kèm header nếu chưa có):
  `| Ngày | Ticket | Loại | Tên | ID | URL | Trạng thái | Ghi chú |`
- Tìm data theo issue: mở `runs/<KEY>/ledger.md`. Tìm xuyên issue: `grep -r "<từ khoá>" runs/*/ledger.md`.
- Bản gộp cũ (trước 2026-10-31) giữ nguyên ở `runs/_ledger-archive-2026-10-31.md`.
- **Xoá data:** chỉ khi người dùng yêu cầu rõ, chỉ item có trong ledger của issue đó (nhận diện bằng Internal tags = issue key), liệt kê trước và chờ xác nhận. Không còn quy ước prefix `QA-` (tên campaign/artwork = title issue).
