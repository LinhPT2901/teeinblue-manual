# TIB-031 — Bằng chứng: partial date range chưa được validate

Ngày kiểm: 2026-08-25 · Env: staging (`https://staging-api.teeinblue.com`) · instance_id=58 · store TZ Asia/Bangkok

Dev confirm: *"nếu chỉ truyền 1 trong 2 date thì trả lỗi"*. Kết quả thực tế: **không endpoint nào trả lỗi**, và 3/4 endpoint **bỏ filter im lặng**.

## Kết quả

| Endpoint | only `start_date` | only `end_date` | Verdict |
|---|---|---|---|
| `GET /api/orders` | 200 — filter bị bỏ | 200 — filter bị bỏ | ❌ FAIL |
| `GET /api/instances/{id}/order-items` | 200 — filter bị bỏ | 200 — filter bị bỏ | ❌ FAIL |
| `GET /openapi/v1/orders` | 200 — filter ÁP DỤNG (open-ended) | 200 — ÁP DỤNG | ⚠️ khác spec (không lỗi) nhưng kết quả đúng |
| `GET /openapi/v1/customizations` | 200 — filter bị bỏ | 200 — filter bị bỏ | ❌ FAIL |

## Chi tiết reproduce

### 1. `GET /api/orders` — bỏ filter, rơi về default 30d
```
GET /api/orders?instance_id=58&per_page=100&start_date=2026-08-19T17:00:00
→ 200, 69 rows, created_at min = 2026-07-27T11:18:13Z  ← 23 ngày TRƯỚC start_date

GET /api/orders?instance_id=58&per_page=100&end_date=2026-08-13
→ 200, 69 rows, created_at max = 2026-08-25T03:45:01Z  ← 12 ngày SAU end_date

GET /api/orders?instance_id=58&per_page=100            (không truyền date)
→ 200, 69 rows, 2026-07-27 → 2026-08-25
```
3 response **giống hệt nhau** → param date bị drop hoàn toàn, request rơi về cửa sổ mặc định 30 ngày.

Đối chứng — truyền đủ 2 date thì đúng:
```
GET /api/orders?instance_id=58&per_page=100&start_date=2026-08-18&end_date=2026-08-21
→ 200, 9 rows, 2026-08-18T10:02:23Z → 2026-08-20T17:00:00Z ✅
```

### 2. `GET /api/instances/58/order-items` — cùng lỗi
```
start-only / end-only / không date  → 200, đều 100 rows, 2026-07-30 → 2026-08-25 (giống hệt nhau)
đủ 2 date (2026-08-18..2026-08-21) → 200, 13 rows, 2026-08-18 → 2026-08-20 ✅
```

### 3. `GET /openapi/v1/customizations` — cùng lỗi
```
GET /openapi/v1/customizations?end_date=2026-08-13
→ 200, 25 rows, max created_at = 2026-08-25T05:07:17Z  ← vượt end_date 12 ngày
start-only / end-only / không date → 200, cả 3 đều 2026-08-20T10:40:21Z → 2026-08-25T05:07:17Z (giống hệt)
đủ 2 date → 200, 14 rows, 2026-08-18T08:15:06Z → 2026-08-20T10:42:26Z ✅
```
→ Phần "sửa `/openapi/customizations` cho giống `/openapi/orders`" chưa lên.

### 4. `GET /openapi/v1/orders` — hành vi khác 3 cái trên
```
GET /openapi/v1/orders?start_date=2026-08-19T17:00:00
→ 200, 10 rows, min = 2026-08-19T17:00:00Z (đúng bằng start_date), max = hôm nay  → filter ÁP DỤNG, range mở đầu cuối

GET /openapi/v1/orders?end_date=2026-08-13
→ 200, 25 rows, max = 2026-08-13T09:15:58Z  → filter ÁP DỤNG
```
Không trả lỗi như dev nói, nhưng kết quả **đúng** (open-ended range). Đây là endpoint duy nhất không bị data leak ngoài range.

## Các case validate khác (đã pass)

```
end_date=not-a-date        → 422 {"message":"The end date field must be a valid date."} ✅
start_date > end_date      → 200, data rỗng (deterministic, không leak) ✅
```

## Impact

Không phải chỉ là "thiếu validation". Với 3 endpoint FAIL, client truyền 1 date sẽ nhận về **data nằm ngoài range đã yêu cầu** mà không có tín hiệu gì — partner/integration sẽ tin đó là kết quả đã lọc. Đây là silent wrong data, không phải chỉ là UX.

## Đề xuất cho dev

Chốt 1 trong 2 hướng và áp dụng **thống nhất cả 4 endpoint**:
- **A (như dev đã confirm):** thiếu 1 trong 2 → 422 với error message rõ ràng.
- **B (như `/openapi/v1/orders` đang chạy):** cho phép range mở một đầu, nhưng phải thực sự áp filter.

Hiện tại đang là hướng thứ 3 — bỏ filter im lặng — và đó là hướng duy nhất không chấp nhận được.

---

# RETEST sau khi dev build lại staging — 2026-08-25

**Kết luận: PASS toàn bộ.** Cả 4 endpoint đã đúng theo đúng spec dev confirm.

| Endpoint | only `start_date` | only `end_date` | |
|---|---|---|---|
| `GET /api/orders` | **422** `end_date field is required when start date is present` | **422** `start_date field is required when end date is present` | ✅ |
| `GET /api/instances/{id}/order-items` | **422** (cùng message) | **422** (cùng message) | ✅ |
| `GET /openapi/v1/orders` | 200 — range mở, filter áp dụng đúng | 200 — áp dụng đúng | ✅ |
| `GET /openapi/v1/customizations` | 200 — range mở, filter áp dụng đúng | 200 — áp dụng đúng | ✅ |

## Bằng chứng filter đã thực sự được áp (không còn drop im lặng)

`/openapi/v1/customizations` — trước đây start-only/end-only/no-date đều trả cùng một tập:
```
?end_date=2026-08-13     → 200, 25 rows, max = 2026-08-13T09:15:38Z   (trước: max 2026-08-25 ❌)
?start_date=2026-08-25T00:00:00 → 200, 13 rows, 2026-08-25T02:59:28Z → 2026-08-25T05:07:17Z
   (đối chứng no-date: 25 rows từ 2026-08-20 → khác tập rõ ràng, filter thật sự chạy)
```

`/openapi/v1/orders`:
```
?start_date=2026-08-25T00:00:00 → 200, 1 row (#ins58-2878 @ 2026-08-25T03:45:01Z)
?end_date=2026-08-13            → 200, max = 2026-08-13T09:15:58Z
```

Portal endpoints không truyền date vẫn giữ default 30 ngày:
```
/api/orders?instance_id=58&per_page=100 → 200, 69 rows, 2026-07-27 → 2026-08-25 ✅
```

## Regression boundary matrix — không hỏng gì

`/api/orders`, instance 58, store TZ UTC+7:
```
start=2026-08-18T17:00:00.000Z & end=2026-08-20T16:59:59.999Z
  → 4 rows: #ins58-2871, #ins58-2875 (@17:00:00Z) + #ins58-2872, #ins58-2876 (@16:59:00Z)

end = 2026-08-20T16:59:00 → A vào (inclusive)                     ✅ 4 rows
end = 2026-08-20T16:58:59 → A rớt, KHÔNG nới ra cuối ngày         ✅ 2 rows
start = 2026-08-19T17:00:00 → C vào (inclusive)                   ✅ 4 rows
start = 2026-08-19T17:00:01 → C rớt, KHÔNG lùi về đầu ngày        ✅ 2 rows
bare date Aug13..Aug13 → vẫn nới đến hết ngày                     ✅ 1 row (#ins58-2864)
```
Lưu ý: dataset staging giờ có thêm `#ins58-2875` / `#ins58-2876` trùng mốc thời gian với C / A. Ground truth "4 order boundary" trong collection cần cập nhật số lượng kỳ vọng.

## Validation khác

```
end_date=not-a-date  → 422 "The end date field must be a valid date."
                        (đúng trên cả /api/orders, /openapi/v1/orders, /openapi/v1/customizations)
start_date > end_date → 200, data rỗng (deterministic, không leak)
```

## Điểm còn lại (không phải bug — cần chốt là intended)

Portal và Open API xử lý partial date **khác nhau**: portal bắt buộc đủ cặp (422), Open API cho phép range mở một đầu. Đúng như dev mô tả (`/openapi/customizations` được sửa cho giống `/openapi/orders`), nên đây là thiết kế có chủ ý. Chỉ cần đảm bảo tài liệu Open API ghi rõ là partner được phép truyền 1 date.
