import { defineConfig, devices } from '@playwright/test';

// Chạy headless (không mở cửa sổ browser). Dùng: npm test
// Login Shopify: npm run auth (chỉ cần chạy lại khi session hết hạn)
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    baseURL: 'https://linh-tib-staging.myshopify.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
  },
  projects: [
    // Kiểm tra session Shopify còn sống trước khi chạy test thật.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { storageState: 'playwright/.auth/shopify.json' },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/shopify.json',
      },
      dependencies: ['setup'],
    },
  ],
});
