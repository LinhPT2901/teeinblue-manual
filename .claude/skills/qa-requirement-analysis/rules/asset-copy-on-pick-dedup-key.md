# Rule: Copy-on-pick asset import + dedup key (clipart → image library, teeinblue)

## Khi nào áp dụng
Issue có keyword: `import clipart to image library`, `copy clipart`, `from-clipart`, `clipart_import_key`, `import once`, `reuse existing library image`, `dedup key`, `url-v` / category `version`, `Choose from a clipart category`, `Replace image layer`, hoặc bất kỳ thay đổi nào **copy một asset dùng chung (shared/library asset) thành bản riêng (owned copy)** tại thời điểm người dùng chọn nó.

Bổ trợ [[asset-library-bulk-thumbnail]], [[image-field-upload-only]], [[rate-limit-public-endpoints]], [[duplicate-link-layer]], [[global-template-kept-fields]].

## Context cần nhận diện

Đây là pattern **"copy-on-pick"**: thay vì layer trỏ trực tiếp tới file của asset dùng chung (clipart), hệ thống copy asset đó sang một không gian sở hữu riêng (image library) và layer trỏ tới bản copy. Mục tiêu là **cắt dependency** để asset gốc bị xoá thì layer không vỡ.

Ba điểm luôn phải tra rõ với pattern này:

1. **Fragility chỉ chuyển chỗ, không mất đi.** Layer giờ phụ thuộc vào **bản copy trong library**. Nếu bản copy cũng xoá được (và library thường cho xoá tự do), thì bug gốc tái hiện y nguyên ở chỗ mới. Luôn hỏi: bản copy có được bảo vệ khi đang được layer dùng không (block delete / warning / soft-delete)?
2. **Dedup key quyết định số bản copy sinh ra.** Key thường ghép `identity + version` (vd `url-v`). Version bump vì **bất cứ** thao tác nào (rename, reorder, đổi màu, đổi thumbnail, restore from trash…) đều sinh **bản copy mới** dù file ảnh không đổi → library phình ra, ăn quota upload. Hỏi chính xác **những thao tác nào bump version** và so với scope PO đã chốt.
3. **Copy = một lần upload thật.** Nó ăn upload/rate limit, ăn storage, ăn thời gian (ảnh lớn, SVG). Còn **reuse thì không**. Ranh giới "lần này copy hay reuse" phải test được từ phía người dùng, không chỉ đọc DB.

## Requirement cần kiểm tra

- **Dedup contract, cả 2 chiều**: cùng asset → đúng 1 bản copy (kể cả pick từ artwork khác, từ tab khác, từ user/staff khác trong cùng shop). Asset đã đổi → bản copy mới, và **layer cũ giữ bản copy cũ** (không bị đổi ảnh ngược).
- **Danh sách chính xác thao tác bump version** trên asset gốc. Đây là điểm gần như luôn lệch giữa mô tả PO ("chỉ khi replace file") và implement ("replace + rename + reorder + màu + thumbnail + restore"). Lệch này không phải bug nếu PO accept, nhưng **phải có confirm**, đừng tự kết luận.
- **Xoá asset gốc** (trash → permanent): layer + artwork thumbnail + storefront form vẫn phải render. Chú ý phân biệt 2 reference khác nhau trên cùng layer: **original image** (đã trỏ library copy) và **default value / preselected item** (có thể vẫn trỏ asset gốc). Vế thứ hai rất dễ bị bỏ sót và làm mục tiêu ticket không đạt trên storefront.
- **Xoá bản copy** trong library: layer đang dùng bị gì? Pick lại có tạo copy mới? Bản copy nằm trong trash thì reuse hay tạo mới?
- **Naming & category của bản copy**: đặt tên theo asset gốc thì trùng tên với ảnh sẵn có trong library xử lý sao (cho trùng / append suffix / reuse). Bản copy không có category → confirm là cố ý.
- **Điểm vào mới phải không phá điểm vào cũ**: tab/flow upload sẵn có của **cùng** popup là regression bắt buộc, không phải tuỳ chọn.
- **Failure atomicity**: copy fail → **không** tạo layer / **không** đổi ảnh layer, có message, popup không đóng. Test cả fail hợp lệ (SVG thiếu `viewBox`, asset không có file) và fail hạ tầng (offline, timeout, 429).
- **Quota/limit**: bản copy mới ăn limit upload; reuse thì không và phải **vẫn chạy được khi đã cạn limit**. Đây là cặp test case bắt buộc đi đôi.
- **Migration**: data cũ (layer đang trỏ asset gốc) có được migrate không. Nếu không → khách hàng đang gặp bug (thường là nguồn của ticket, xem Crisp link) **vẫn gặp bug** trên artwork cũ. Phải làm rõ với PO/support đây là known limitation đã thống nhất.

## Impacted areas

- Popup thêm layer (mọi layer type nó tạo được — không chỉ layer type "chính" nêu trong ticket). — Confirmed khi ticket nói "every layer it can create"
- Popup replace image layer (single + multi-select) và tab upload/library cũ của nó. — Confirmed
- Image library: listing, tên, category, trash, upload limit/quota. — Confirmed
- Asset library gốc (clipart/vector): replace, rename, reorder, đổi thumbnail, trash/restore — vì các thao tác này bump version. — Confirmed
- Storefront personalization form: preselect/default value của layer từ category. — Need Dev/PO confirmation
- Render: artwork thumbnail, mockup, design generate cho order. — Assumption (đổi nguồn file ⇒ phải verify render không đổi)
- Clone/duplicate artwork, global template propagate: bản copy được share hay nhân bản. — Need Dev/PO confirmation (gần như luôn thiếu trong ticket)
- Permission gating của endpoint copy mới (xem [[role-permission-granularity]]) + ownership check cross-tenant (xem [[access-control-idor]]). — Confirmed khi ticket nêu 403/404

## Risks

- **Rủi ro số 1: fix không đạt mục tiêu vì reference thứ hai vẫn trỏ asset gốc** (default value, preselect) → xoá clipart vẫn vỡ ở storefront dù artwork editor render ổn.
- **Rủi ro số 2: bản copy trong library xoá được** → bug gốc tái hiện, chỉ khác chỗ phát sinh.
- Library phình: version bump vì thao tác vô hại (rename/reorder) → mỗi lần pick lại thêm 1 ảnh, seller không hiểu vì sao library đầy và quota hết.
- Ảnh rất lớn / SVG lớn: copy chậm → double-submit, duplicate copy, hoặc fail khi 2 tab pick đồng thời. Spinner + disable button là phần dễ miss nhất.
- Silent failure: lỗi không có response (offline/timeout) → không message, button chỉ ngừng spin → seller tưởng đã lưu.
- Artwork legacy không migrate → ticket "đã fix" nhưng khách cũ vẫn báo lại đúng lỗi đó.
- Thứ tự deploy API trước portal: portal lên trước → endpoint chưa có → mọi lần pick đều fail. Verify môi trường test đã deploy đủ 2 repo trước khi kết luận fail.
- Staff có quyền sửa artwork nhưng không có quyền upload library → giờ ngầm tạo ảnh trong library. Xác nhận đó là ý định.

## Open questions template

- Bản copy trong library có bị chặn xoá khi đang được layer dùng không? Nếu xoá được thì layer + thumbnail ra sao?
- Default value / preselect của layer category trỏ tới clipart gốc hay bản copy? Xoá clipart gốc thì storefront form hiển thị gì?
- Chính xác những thao tác nào trên clipart bump version → sinh bản copy mới? PO có accept việc rename/reorder cũng sinh copy mới không?
- Bản copy trùng tên với ảnh sẵn có trong library: xử lý thế nào?
- Clone/duplicate artwork và global template propagate: bản copy được share chung hay nhân bản thêm?
- Layer cũ (đang trỏ clipart) có migrate không? Nếu không, khách đang report bug được trả lời thế nào?
- Bản copy ăn storage/billing của shop không? Có hiện trong quota nào seller thấy được?
- Endpoint copy mới gate bằng permission nào, có khớp với permission upload library không?
- Timeout/giới hạn size cho asset lớn là bao nhiêu? Có job async hay đồng bộ trong request?

## Suggested test focus

1. **Mục tiêu ticket, end-to-end**: pick clipart → Save → xoá clipart (trash + permanent) → verify layer, artwork thumbnail, **storefront form**, và design generate của order mới đều còn đúng ảnh.
2. **Ma trận dedup**: cùng clipart pick lại trong cùng artwork / artwork khác / qua popup replace → đúng 1 bản copy. Sau khi replace file clipart → bản copy mới, layer cũ giữ ảnh cũ.
3. **Version bump matrix**: rename / reorder / đổi màu / đổi thumbnail / restore from trash → đếm số bản copy sinh ra, đối chiếu với scope PO.
4. **Xoá bản copy trong library** → layer đang dùng + pick lại.
5. **Ma trận layer type**: mọi layer type mà popup tạo được, gồm cả vector (kết quả phải là SVG).
6. **Negative + atomicity**: SVG thiếu `viewBox`, asset không có file, offline, 429 khi cạn limit — mỗi case verify "không tạo layer / không đổi ảnh" + message + popup còn mở.
7. **Limit pairing**: shop cạn limit → clipart chưa từng copy = bị chặn; clipart đã copy = vẫn chạy.
8. **Asset lớn**: ảnh raster rất lớn + SVG lớn, đo thời gian, verify spinner/disable, size & position layer đúng, thumbnail library bình thường; 2 tab pick đồng thời.
9. **Regression điểm vào cũ**: tab upload/library của cả 2 popup; multi-select replace; layer/flow không có action replace vẫn không có.
10. **API**: clipart của shop khác → 404; staff thiếu permission → 403; 2 request nhanh liên tiếp cùng clipart → 1 bản copy.
