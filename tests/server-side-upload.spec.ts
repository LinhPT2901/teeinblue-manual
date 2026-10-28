import { test, expect, request as pwRequest } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TC-TIB-010 — [Edge] Server-side / non-browser caller
 *
 * Ý nghĩa: upload gọi từ 1 client server-to-server (KHÔNG có header trình duyệt
 * như Origin/Referer/cookie). Kỳ vọng: upload vẫn thành công, và cột
 * customer_uploads.source_domain để RỖNG (by design).
 *
 * Playwright `request` (APIRequestContext) mặc định KHÔNG gửi Origin/Referer,
 * nên nó chính là "server-side caller" cần mô phỏng — không dùng browser page.
 *
 * Phần "upload succeeds" được assert tự động ở đây.
 * Phần "source_domain empty" verify ở DB (xem query cuối test) vì API không expose field này.
 */

const SHOP = 'linh-tib-staging.myshopify.com';
const API = 'https://staging-api.teeinblue.com/api/merchant/shopify';
const CAMPAIGN_ID = 2486; // lấy từ payload widget của product customer-upload
const PHOTO = path.resolve(process.cwd(), 'IMG_1790.jpeg');

test('TC-TIB-010: upload server-side (no browser headers) thành công', async () => {
  const file = fs.readFileSync(PHOTO);

  // Context KHÔNG kèm Origin/Referer/cookie => đúng như caller server-to-server
  const api = await pwRequest.newContext();

  // 1) Presign — bước server tạo row customer_uploads & suy ra source_domain từ Origin/Referer
  const presign = await api.post(`${API}/upload-url?shop=${SHOP}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    data: {
      filename: 'IMG_1790.jpeg',
      filesize: file.length,
      mimetype: 'image/jpeg',
      strategy: 'any',
      width: 4032,
      height: 3024,
      campaign_id: CAMPAIGN_ID,
    },
  });
  expect(presign.status(), 'POST /upload-url').toBe(200);
  const pj = await presign.json();
  const uploadId = pj.id;
  expect(uploadId, 'response phải trả customer_uploads id').toBeTruthy();

  // 2) PUT ảnh lên S3 theo signed_url
  const put = await api.fetch(pj.signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    data: file,
  });
  expect(put.status(), 'PUT ảnh lên S3').toBe(200);

  // 3) Confirm uploaded-at
  const confirm = await api.post(`${API}/customer-uploads/${uploadId}/uploaded-at?shop=${SHOP}`, {
    headers: { Accept: 'application/json' },
  });
  expect(confirm.status(), 'POST /uploaded-at').toBe(204);

  await api.dispose();

  console.log(`✅ Upload server-side OK. customer_uploads.id = ${uploadId}`);
  console.log('👉 VERIFY DB (source_domain phải RỖNG):');
  console.log(`   SELECT id, source_domain FROM customer_uploads WHERE id = ${uploadId};`);
});
