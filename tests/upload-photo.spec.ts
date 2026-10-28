import { test, expect } from '@playwright/test';
import path from 'node:path';

// URL sản phẩm customer-upload trên store staging
const PRODUCT_URL =
  'https://linh-tib-staging.myshopify.com/en-vn/products/customer-upload?variant=53969324376380';

// Password của storefront (staging đang bật password protection)
const STORE_PASSWORD = process.env.STORE_PASSWORD || 'oe';

// File ảnh lấy trong project hiện tại
const PHOTO = path.resolve(process.cwd(), 'IMG_1790.jpeg');

test('Upload 1 ảnh qua widget TeeInBlue (headless)', async ({ page }) => {
  // 1) Vượt qua trang password của storefront
  await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/password')) {
    await page.fill('input[name="password"]', STORE_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('button[type="submit"], input[type="submit"]'),
    ]);
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
  }
  expect(page.url(), 'Phải vào được trang sản phẩm, không bị chặn ở /password').not.toContain(
    '/password',
  );

  // 2) Đợi widget TeeInBlue render nút "Choose an image"
  await page.waitForSelector('label.tee-btn--upload', { state: 'visible', timeout: 30_000 });

  // 3) Đăng ký chờ các tín hiệu upload THẬT của widget:
  //    presign (/upload-url) -> S3 PUT (customers/uploads) -> confirm (/uploaded-at)
  const presign = page.waitForResponse(
    (r) => r.url().includes('/merchant/shopify/upload-url') && r.request().method() === 'POST',
    { timeout: 60_000 },
  );
  const s3Put = page.waitForResponse(
    (r) => /customers\/uploads/.test(r.url()) && r.request().method() === 'PUT',
    { timeout: 60_000 },
  );

  // 4) Đi đúng luồng người dùng: bấm "Choose an image" -> file chooser -> chọn ảnh
  const uploadLabel = page.locator('label.tee-btn--upload', { hasText: 'Choose an image' }).first();
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10_000 }),
    uploadLabel.click(),
  ]);
  await fileChooser.setFiles(PHOTO);

  // 5) Verify tín hiệu mạng
  const presignResp = await presign;
  expect(presignResp.status(), 'API presign /upload-url phải trả 200').toBe(200);

  const putResp = await s3Put;
  expect(putResp.status(), 'S3 PUT ảnh lên storage phải thành công (2xx)').toBeLessThan(300);

  // 6) Verify UI: ảnh preview đã upload xuất hiện trong widget
  const uploadedImg = page.locator('img[src*="customers/uploads"]').first();
  await expect(uploadedImg, 'Ảnh đã upload phải hiển thị preview trong widget').toBeVisible({
    timeout: 30_000,
  });

  const src = await uploadedImg.getAttribute('src');
  await page.screenshot({ path: 'evidence/upload-evidence.png' });
  console.log('✅ Upload thành công. Preview:', src);
});
