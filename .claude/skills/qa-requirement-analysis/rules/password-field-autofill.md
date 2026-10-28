# Rule: Field password bị password manager / browser autofill điền sai

## Khi nào áp dụng
Issue có keyword: `autocomplete`, `autofill`, `password manager`, `current-password`, `new-password`, `confirm-password`, "đúng password vẫn báo sai", "password field bị điền sẵn", dialog xác nhận password (sudo mode), form đổi/set password.

## Context cần nhận diện
- Password manager (Chrome/Safari/Edge built-in, 1Password, Bitwarden, LastPass...) **đoán loại field** dựa vào `name`, `id`, `autocomplete`, số field password và có field username hay không. Field lẻ tên `confirm-password` không `autocomplete` → bị hiểu là "nhập lại password mới" → điền password generate/sai.
- Autofill nhiều khi **set value mà không bắn `input` event** → `v-model`/state framework vẫn rỗng dù UI hiện dấu chấm. Bug kiểu này **không tái hiện được khi gõ tay** — QA phải test bằng autofill thật.
- Mỗi manager hành xử khác nhau, và khác nhau giữa **trang thường vs iframe** (Shopify embedded admin).
- Fix điển hình: hidden username + `autocomplete="current-password"` (cho form xác nhận) / `new-password` (cho form đổi password), và đọc value thẳng từ DOM lúc submit.

## Requirement cần kiểm tra
- Attribute đúng trên DOM: `autocomplete`, hidden username có value = email account đang login (không lộ email khác), không focus/tab tới được.
- Autofill gợi ý đúng credential của **account đang login** (không phải account khác cùng domain, không gợi ý "generate strong password").
- Submit cả bằng **click nút** và **Enter** đều gửi đúng value đang hiển thị.
- Phân biệt message: rỗng vs sai password; whitespace-only xử lý thế nào (Laravel `TrimStrings` thường loại trừ field password).
- Sau submit thành công: manager có bật prompt "save/update password" lạ không.

## Risks
- Chỉ test gõ tay → PASS giả, không chứng minh fix.
- Dùng Playwright/headless: không có password manager thật → phải mô phỏng (set value không bắn event) hoặc test tay trên Chrome thật.
- Dialog dùng chung cho nhiều sensitive action → fix 1 chỗ nhưng regression nhiều chỗ.

## Đã xác nhận (TIB-5628, dev trungld 2026-10-28)
- Confirm password trên teeinblue portal có hiệu lực **15 phút**. Mọi sensitive action dùng chung 1 component, nên regression chỉ cần check 1 action khác.
- Để trống thì FE chặn, không gọi API. Toàn khoảng trắng thì API báo "incorrect" (không trim). Hidden username là email đang login, không gửi lên API.
- Account chưa có password: dialog có link tới trang tạo password. Scope chỉ portal.
- Lúc chạy test: case cần thấy dialog phải bắt đầu từ fresh login hoặc chờ quá 15 phút.

## Open questions template
- Dialog/component này dùng ở những action nào?
- Manager/browser nào nằm trong scope verify?
- FE có validate rỗng trước khi gọi API không, hay chỉ dựa vào message API?
- Whitespace-only password trả message nào?
