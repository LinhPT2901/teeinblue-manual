# Rule: Tách quyền mới / đổi permission gating cho một action (teeinblue portal)

## Khi nào áp dụng
Issue có keyword: `permission`, `role`, `staff không có quyền`, `This action is unauthorized`, `tách quyền riêng`, `gate UI behind permission`, `seeder quyền`, `checkbox quyền phụ thuộc`, hoặc bất kỳ thay đổi nào chuyển một endpoint từ permission A sang permission B.

## Context cần nhận diện (teeinblue)
- 2 role mặc định: `owner`, `editor`; merchant tạo thêm **custom role** tại `/roles`, gán staff tại `/staffs`. Xem thêm `session-auth-2fa-migration.md` cho 2 đường login (Shopify-embedded vs teeinblue invite).
- Quyền lưu trong DB, thêm quyền mới thường đi kèm **seeder**: tạo record permission + gán vào role built-in. Không chạy seeder = quyền không tồn tại → **chặn cả owner**.
- Quyền built-in được seeder gán; **custom role do merchant tự tạo trước đó KHÔNG được backfill** → staff đang dùng được tính năng có thể mất quyền sau deploy.
- Form Role trong portal nhóm checkbox theo module (Campaigns, Orders, Store Settings...). Quyền con thường **phụ thuộc** vào quyền `View` của nhóm (disabled tới khi tick View, auto-untick khi bỏ View).

## Requirement cần kiểm tra
- **3 tầng phải khớp nhau**: (1) DB/seeder có permission, (2) API enforce đúng permission mới và **bỏ hẳn** permission cũ, (3) UI disable/hide entry point theo đúng permission đó.
- Ownership/tenant check phải **giữ nguyên** song song với permission check — quyền mới không được thay thế kiểm tra store thuộc đúng account.
- Dependency giữa quyền cha (View) và quyền con: hỏi rõ dependency đó chỉ ở **UI form Role** hay **API cũng enforce**. Rất thường chỉ có ở UI → role cũ/API call trực tiếp có thể có quyền con mà không có quyền cha.
- Entry point phải liệt kê **đầy đủ**: cùng một endpoint thường có ≥2 nút gọi tới (listing page + editor/detail). Bỏ sót 1 nút = vẫn trigger được lỗi cũ.
- Hành vi mong đợi của UI khi thiếu quyền: **disable + tooltip** hay **hide**? Hai cái khác nhau, phải chốt rõ (issue hay viết "hide or disable").

## Impacted areas
- Form create/edit Role (`/roles`) — layout nhóm checkbox, validate khi save.
- Mọi UI entry point gọi endpoint bị đổi gating.
- Role built-in owner/editor sau seeder; custom role đã tồn tại từ trước.
- Các endpoint khác **vẫn** dùng permission cũ (vd Store Settings) — phải regression để chắc là không bị nới lỏng nhầm.
- Tài liệu/KB mô tả bảng permission cho merchant.

## Risks
- **Seeder không chạy khi deploy** → owner cũng bị chặn = sự cố production diện rộng. Đây là risk số 1, QA phải verify permission đã tồn tại trên môi trường test trước khi kết luận fail.
- **Thứ tự deploy** (API trước, portal sau): portal lên trước → tick quyền mới rồi save role sẽ lỗi vì permission chưa có trong DB.
- **Regression im lặng cho custom role cũ**: staff đang làm được việc bỗng mất nút sau deploy, không có thông báo nào.
- **Nới quyền ngoài ý muốn**: quyền mới được gán cho role không nên có (vd editor mặc định) hoặc endpoint khác vô tình dùng chung policy.
- Cache quyền/session: staff đang đăng nhập có thấy quyền mới ngay hay phải re-login? Ảnh hưởng trực tiếp tới step test.
- Multi-store: 1 staff thuộc nhiều store với role khác nhau → quyền phải tính theo store đang chọn, không phải theo account.

## Suggested test focus
1. **Owner positive** — mọi entry point vẫn hoạt động y như trước (chứng minh seeder đã chạy).
2. **Staff đúng case ticket**: có quyền mới nhưng **không** có Store Settings → phải làm được (đây là mục tiêu của ticket).
3. **Staff thiếu quyền mới**: mọi entry point disabled + tooltip; và gọi API trực tiếp vẫn phải bị chặn (UI disable không thay cho server-side check).
4. **Dependency checkbox**: tick/untick quyền cha trong form Role, cả lúc tạo mới lẫn lúc sửa role đang gán cho staff.
5. **Custom role cũ** tạo trước deploy → xác nhận hành vi (mất quyền là by design hay bug).
6. **Cache/session**: đổi role khi staff đang đăng nhập → quyền cập nhật ngay hay sau re-login.
7. Regression các tính năng khác vẫn dùng permission cũ.

## Open questions template
- Disable + tooltip hay hide hẳn? Nội dung tooltip/message chính xác?
- API có enforce dependency quyền-cha hay chỉ UI?
- Seeder gán quyền mới cho những role nào, và có backfill custom role cũ không?
- Staff đang đăng nhập có cần re-login để thấy thay đổi quyền?
- Với multi-store staff, quyền tính theo store nào?
- Endpoint cũ (permission cũ) có còn đường nào gọi tới tính năng này không?
