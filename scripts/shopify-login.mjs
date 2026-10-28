#!/usr/bin/env node
/**
 * Manual Shopify login → saves storageState for reuse.
 *
 *   npm run auth                    # default store (linh-tib-checkout)
 *   STORE=linh-tib-staging npm run auth
 *
 * Opens a headed browser, waits for you to log in by hand (SSO / 2FA / passkey all fine),
 * then writes playwright/.auth/shopify.json. Later runs reuse that file and skip login.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STORE = process.env.STORE || 'linh-tib-checkout';
const AUTH_FILE = path.resolve('playwright/.auth/shopify.json');
const ADMIN = `https://admin.shopify.com/store/${STORE}`;
const WAIT_MS = 10 * 60 * 1000; // 10 minutes to finish login by hand

fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--window-size=1600,1000'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

console.log(`\n→ Opening ${ADMIN}`);
console.log('→ Log in in the browser window. Waiting up to 10 minutes...\n');
await page.goto(ADMIN);

// Logged in once we land on the store admin and the top bar has rendered.
await page.waitForURL(/admin\.shopify\.com\/store\//, { timeout: WAIT_MS });
await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});

await context.storageState({ path: AUTH_FILE });
console.log(`✓ Auth state saved → ${AUTH_FILE}`);
console.log('  Covers every store on this Shopify account, not just ' + STORE + '.\n');

await browser.close();
