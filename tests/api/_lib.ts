import { request, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';

// Helper cho script API theo task: tests/api/<KEY>.spec.ts
// Chạy: npx playwright test --project=api tests/api/<KEY>.spec.ts
// Repo là public: token chỉ gọi qua tên biến .env, id lấy từ runs/<KEY>/data.json.
if (fs.existsSync('.env')) process.loadEnvFile('.env');

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến ${name} trong .env`);
  return value;
}

export function runData(key: string): any {
  return JSON.parse(fs.readFileSync(`runs/${key}/data.json`, 'utf8'));
}

function client(baseVar: string, tokenVar?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: `${env(baseVar).replace(/\/$/, '')}/`,
    extraHTTPHeaders: {
      Accept: 'application/json',
      ...(tokenVar ? { Authorization: `Bearer ${env(tokenVar)}` } : {}),
    },
  });
}

// Bỏ tokenVar để gọi không có Authorization. Path viết không có dấu / đầu: api.get('orders').
export const openApi = (tokenVar?: string) => client('TIB_OPENAPI_BASE', tokenVar);
export const portalApi = (tokenVar?: string) => client('TIB_API_BASE', tokenVar);
