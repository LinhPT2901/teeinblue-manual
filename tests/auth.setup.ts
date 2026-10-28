import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';

const AUTH_FILE = 'playwright/.auth/shopify.json';
const STORE = process.env.STORE || 'linh-tib-checkout';

/**
 * Guards every run: confirms the saved Shopify session still works.
 * It never logs in itself — Shopify login is interactive (SSO / 2FA / passkey).
 * When this fails, run:  npm run auth
 */
setup('shopify session is valid', async ({ page }) => {
  expect(
    fs.existsSync(AUTH_FILE),
    `No saved Shopify session at ${AUTH_FILE}. Run: npm run auth`,
  ).toBe(true);

  await page.goto(`https://admin.shopify.com/store/${STORE}`);

  // A live session lands on the store admin; an expired one bounces to accounts.shopify.com.
  await expect(page, 'Shopify session expired. Run: npm run auth').toHaveURL(
    /admin\.shopify\.com\/store\//,
    { timeout: 30_000 },
  );
});
