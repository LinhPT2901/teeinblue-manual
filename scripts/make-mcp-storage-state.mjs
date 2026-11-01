#!/usr/bin/env node
/**
 * Tạo storageState đã login sẵn cho các server Playwright MCP chạy --isolated (playwright-2, playwright-3).
 *
 *   node scripts/make-mcp-storage-state.mjs
 *
 * Gồm:
 *  - Session portal staging (Sanctum: csrf-cookie → POST /api/login) bằng TIB_STAGING_EMAIL/PASSWORD trong .env
 *  - Cookie mở khoá storefront (password `TIB_STORE_PASSWORD`, mặc định `oe`) cho linh-tib-staging + linh-tib-checkout
 *  - Cookie Shopify admin lấy từ playwright/.auth/shopify.json nếu có (tạo bằng `npm run auth`)
 * Ghi ra playwright/.auth/mcp-isolated.json (đã gitignore). Session hết hạn thì chạy lại.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('playwright/.auth/mcp-isolated.json');
const SHOPIFY = path.resolve('playwright/.auth/shopify.json');
const PORTAL = 'https://staging-portal.teeinblue.com';
const API = 'https://staging-api.teeinblue.com';
const STORES = ['linh-tib-staging', 'linh-tib-checkout'];

function env(key) {
  const line = fs.readFileSync('.env', 'utf8').split('\n').find(l => l.startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(key.length + 1).replace(/\s+#.*$/, '').trim().replace(/^['"]|['"]$/g, '');
}

const email = env('TIB_STAGING_EMAIL');
const password = env('TIB_STAGING_PASSWORD');
if (!email || !password) throw new Error('Thiếu TIB_STAGING_EMAIL / TIB_STAGING_PASSWORD trong .env');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(fs.existsSync(SHOPIFY) ? { storageState: SHOPIFY } : {});
const page = await context.newPage();

// Portal: Sanctum session
const headers = { Origin: PORTAL, Referer: `${PORTAL}/`, Accept: 'application/json' };
await context.request.get(`${API}/sanctum/csrf-cookie`, { headers });
const xsrf = (await context.cookies(API)).find(c => c.name === 'XSRF-TOKEN');
if (!xsrf) throw new Error('Không nhận được XSRF-TOKEN từ /sanctum/csrf-cookie');
const login = await context.request.post(`${API}/api/login`, {
  headers: { ...headers, 'X-XSRF-TOKEN': decodeURIComponent(xsrf.value), 'Content-Type': 'application/json' },
  data: { email, password },
});
if (!login.ok()) throw new Error(`POST /api/login → ${login.status()}`);

await page.goto(`${PORTAL}/campaigns`);
await page.waitForTimeout(3000);
if (page.url().includes('/login')) throw new Error('Portal vẫn redirect về /login sau khi login API');
console.log('✓ portal session OK');

// Storefront password
const storePassword = env('TIB_STORE_PASSWORD') || 'oe';
for (const store of STORES) {
  await page.goto(`https://${store}.myshopify.com/password`);
  const input = page.locator('input[type="password"]');
  if (await input.count()) {
    await input.first().fill(storePassword);
    await input.first().press('Enter');
    await page.waitForLoadState('domcontentloaded');
  }
  console.log(`✓ storefront ${store}: ${page.url().includes('/password') ? 'VẪN BỊ KHOÁ' : 'mở khoá OK'}`);
}

console.log(fs.existsSync(SHOPIFY) ? '✓ đã gộp session Shopify admin từ shopify.json' : '• chưa có shopify.json → server isolated không vào được Shopify admin (dùng server `playwright`)');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await context.storageState({ path: OUT });
console.log(`✓ storageState → ${OUT}`);
await browser.close();
