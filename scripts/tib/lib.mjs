/**
 * Helper dùng lại cho execute test teeinblue (storefront SDK, merchant API, mạng, evidence).
 * Dùng qua runner: node scripts/tib/run.mjs --key TIB-xxxx <case.mjs ...>  (xem scripts/tib/README.md)
 *
 * Nguyên tắc: không chờ cố định — mọi bước chờ đúng điều kiện (response, selector, until()).
 * Ngoại lệ duy nhất: 60ms sau khi gõ để qua debounce 10ms của SDK (flows/qa-rules.md, Rule 13).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Môi trường đang chạy. Mặc định staging; prod-run.mjs gọi configure() theo tests/prod/env.<env>.json. */
export const cfg = {
  env: 'staging',
  api: 'https://staging-api.teeinblue.com',
  stores: { v1: 'linh-tib-staging.myshopify.com', v2: 'linh-tib-checkout.myshopify.com' },
  storePasswordEnv: 'TIB_STORE_PASSWORD',
  storePasswordDefault: 'oe',
};
export function configure(c = {}) {
  Object.assign(cfg, { ...c, stores: { ...cfg.stores, ...(c.stores || {}) } });
  return cfg;
}
const TEST_DATA = path.join(ROOT, 'test-data');
const SF_KEYS = ['teeinblue-customizations', 'teeinblue-global-options', 'teeinblue-text-to-image-gen-state'];
const SDK_RE = /(?:staging-)?sdk\.teeinblue\.com\/.+\/(app-v\d|index)\.js/;
const loadedBundle = new WeakMap(); // page → { src, bytes } của bundle SDK trang đã nạp (ghi trong sf.open)

export function env(key) {
  const line = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').find(l => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).replace(/\s+#.*$/, '').trim().replace(/^['"]|['"]$/g, '');
}

/** Đường dẫn file test — chỉ chấp nhận file có sẵn trong test-data/. */
export function testFile(rel) {
  const p = path.resolve(TEST_DATA, rel);
  if (!p.startsWith(TEST_DATA + path.sep) || !fs.existsSync(p)) throw new Error(`File test phải có sẵn trong test-data/: ${rel}`);
  return p;
}

/** Chờ fn() trả giá trị truthy; thay cho waitForTimeout / sleep. */
export async function until(fn, { timeout = 30_000, interval = 500, message = 'điều kiện' } = {}) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Hết ${timeout}ms chờ ${message}${last instanceof Error ? `: ${last.message}` : ''}`);
}

// ---------- Storefront SDK ----------

/** Locator của một field: số / "layer-<id>" → .tee-field--layer-<id>; chữ khác → theo tiêu đề field (khớp đúng). */
export function field(page, ref) {
  const id = String(ref).replace(/^layer-/, '');
  if (/^\d+$/.test(id)) return page.locator(`.tee-field--layer-${id}`);
  return page.locator('.tee-field').filter({ has: page.locator('.tee-field__heading > span:first-child').getByText(String(ref), { exact: true }) });
}

export const sf = {
  /** Mở product, tự qua password storefront, xoá state SDK (mặc định), chờ widget render. */
  async open(page, { store = 'v1', handle, variant, clearState = true, locale = '' } = {}) {
    const shop = cfg.stores[store] || store;
    const url = `https://${shop}${locale ? `/${locale}` : ''}/products/${handle}${variant ? `?variant=${variant}` : ''}`;
    if (!loadedBundle.has(page)) {
      loadedBundle.set(page, null);
      page.on('response', r => SDK_RE.test(r.url()) && r.body().then(b => loadedBundle.set(page, { src: r.url(), bytes: b.length, fromCache: r.fromServiceWorker() || r.status() === 304 })).catch(() => {}));
    }
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/password')) {
      await page.locator('input[type="password"]').first().fill(env(cfg.storePasswordEnv) || cfg.storePasswordDefault || '');
      await Promise.all([page.waitForURL(u => !u.pathname.includes('/password')), page.locator('input[type="password"]').first().press('Enter')]);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
    if (clearState) {
      await page.evaluate(keys => keys.forEach(k => localStorage.removeItem(k)), SF_KEYS);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await page.locator('.tee-field:not(.sr-only)').first().waitFor({ timeout: 30_000 }); // template duy nhất bị ẩn (sr-only)
    return { shop, url: page.url(), sdk: await sf.version(page) };
  },

  /** 'v1' nếu có nút ATC của SDK, ngược lại 'v2' (dùng nút theme). */
  async version(page) {
    return (await page.locator('#teeAtcButton, button.tee-btn--atc').count()) ? 'v1' : 'v2';
  },

  /** Danh sách field đang hiện: id layer, tiêu đề, loại control. */
  async fields(page) {
    return page.evaluate(() => [...document.querySelectorAll('.tee-field')].map(f => ({
      id: (f.className.match(/tee-field--layer-(\d+)/) || [])[1] || null,
      kind: (f.className.match(/tee-field--([a-z_]+)(?:\s|$)/) || [])[1] || null,
      label: f.querySelector('.tee-field__heading > span')?.textContent.trim() || '',
      required: !!f.querySelector('.tee-asterisk'),
      hidden: f.classList.contains('sr-only'),
      invalid: f.classList.contains('tee-field--invalid'),
      controls: [...f.querySelectorAll('input,textarea,select')].map(e => e.tagName.toLowerCase() + (e.type ? `:${e.type}` : '')),
    })));
  },

  /** Chọn template (select đầu tiên). label = chữ hiển thị của option. */
  async template(page, label) {
    const sel = page.locator('.tee-field--template select');
    await sel.selectOption({ label });
    await until(async () => (await page.locator('.tee-field').count()) > 1, { timeout: 15_000, interval: 200, message: 'field của template' });
  },

  /** Điền một field: input/textarea (xoá trước rồi gõ), select (theo label), radio/swatch (click label). */
  async fill(page, ref, value) {
    const f = field(page, ref);
    await f.first().waitFor({ timeout: 15_000 });
    const ctrl = f.locator('textarea, select, input:not([type=file]):not([type=radio]):not([type=checkbox]):not([type=hidden])').first();
    if (!(await ctrl.count())) {
      await f.locator('label', { hasText: String(value) }).first().click();
    } else if ((await ctrl.evaluate(e => e.tagName)) === 'SELECT') {
      await ctrl.selectOption({ label: String(value) }).catch(() => ctrl.selectOption(String(value)));
    } else {
      await ctrl.click();
      await ctrl.press('ControlOrMeta+a');
      await ctrl.press('Delete');
      await ctrl.fill(String(value));
    }
    await page.waitForTimeout(60); // debounce SDK 10ms
  },

  /** Upload file test-data/ vào field; chờ tới request upload cuối cùng thành công. Trả mọi request upload. */
  async upload(page, ref, rel, { timeout = 150_000 } = {}) {
    const file = testFile(rel);
    const seen = [];
    const FINAL = /\/uploaded-at|\/v1\/shopify\/uploads|\/(photo|vector|pdf|gpx)-upload|image-filter-effects\/async/;
    const onResp = r => {
      if (/upload|customer-uploads|image-filter-effects/.test(r.url()) && r.request().method() !== 'OPTIONS')
        seen.push({ method: r.request().method(), url: r.url().split('?')[0], status: r.status() });
    };
    page.on('response', onResp);
    const t0 = Date.now();
    try {
      await field(page, ref).locator('input[type=file]').first().setInputFiles(file);
      await until(() => seen.find(s => FINAL.test(s.url) && s.status < 400) || seen.find(s => s.status === 429), { timeout, interval: 300, message: `upload ${rel}` });
    } finally {
      page.off('response', onResp);
    }
    return { file: rel, ms: Date.now() - t0, requests: seen };
  },

  /** Bấm ATC; chờ POST customization + cart/add. Không có customization → trả lỗi validation đang hiện. */
  async addToCart(page, { timeout = 30_000 } = {}) {
    const v = await sf.version(page);
    const custP = page.waitForResponse(r => /\/api\/merchant\/shopify\/customization\?/.test(r.url()) && r.request().method() === 'POST', { timeout }).catch(() => null);
    const cartP = page.waitForResponse(r => /\/cart\/add(\.js)?(\?|$)/.test(r.url()), { timeout }).catch(() => null);
    await page.locator(v === 'v1' ? '#teeAtcButton, button.tee-btn--atc' : 'button.product-form__submit').first().click();
    // thoát sớm khi validation chặn (field báo invalid) thay vì chờ hết timeout
    const invalidP = page.locator('.tee-field--invalid').first().waitFor({ timeout }).then(() => null).catch(() => null);
    const cust = await Promise.race([custP, invalidP]);
    if (!cust) {
      const invalid = await page.evaluate(() => ({
        message: document.querySelector('.tee-error__message')?.textContent.trim() || null,
        fields: [...document.querySelectorAll('.tee-field--invalid')].map(f => ({
          id: (f.className.match(/tee-field--layer-(\d+)/) || [])[1] || null,
          label: f.querySelector('.tee-field__heading > span')?.textContent.trim() || '',
        })),
      }));
      return { ok: false, sdk: v, reason: 'không có POST customization (validation chặn hoặc SDK không gửi)', invalid };
    }
    const body = await cust.json().catch(() => null);
    const cart = await cartP;
    return {
      ok: cust.ok() && !!cart?.ok(), sdk: v,
      customization: { status: cust.status(), rateLimitRemaining: cust.headers()['x-ratelimit-remaining'], body },
      cartAdd: cart ? { status: cart.status() } : null,
    };
  },

  cart: page => page.evaluate(() => fetch('/cart.js').then(r => r.json())),
  clearCart: page => page.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }).then(r => r.status)),
  current: page => page.evaluate(() => window.teeinblue?.getCurrentCustomization?.()),
  storage: page => page.evaluate(keys => Object.fromEntries(keys.map(k => [k, JSON.parse(localStorage.getItem(k) || 'null')])), SF_KEYS),
  productJs: (page, handle) => page.evaluate(h => fetch(`/products/${h}.js`).then(r => r.json()), handle),

  /** Lưu SVG preview thật (bị che trong mockup) ra html + png. */
  async previewSvg(page, outBase) {
    const svg = await page.locator('.tee-mockup-artwork__wrapper svg').first().evaluate(e => e.outerHTML);
    fs.mkdirSync(path.dirname(outBase), { recursive: true });
    fs.writeFileSync(`${outBase}.html`, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">${svg}</body>`);
    const p = await page.context().newPage();
    await p.goto('file://' + path.resolve(`${outBase}.html`));
    await p.locator('svg').first().screenshot({ path: `${outBase}.png` });
    await p.close();
    return { html: `${outBase}.html`, png: `${outBase}.png` };
  },

  /** Bundle SDK trang đang chạy so với bản server (Rule 12). bust=true thì nạp lại cache và reload. */
  async bundle(page, { bust = false } = {}) {
    // bản trang đang chạy = response bundle bắt được trong sf.open; bản server tải mới từ Node (fetch trong trang bị CORS)
    const pg = loadedBundle.get(page) || await page.evaluate(re => {
      const s = [...document.querySelectorAll('script[src]')].find(x => new RegExp(re).test(x.src));
      return s ? { src: s.src, bytes: null } : null;
    }, SDK_RE.source);
    if (!pg) return null;
    const res = await fetch(pg.src, { cache: 'no-store' });
    const server = Buffer.byteLength(await res.text());
    const r = { src: pg.src.split('?')[0], running: pg.bytes, server, lastModified: res.headers.get('last-modified'), same: pg.bytes === server };
    if (bust && !r.same) {
      await page.evaluate(src => fetch(src, { cache: 'reload', mode: 'no-cors' }), pg.src);
      await page.reload({ waitUntil: 'domcontentloaded' });
      r.busted = true;
    }
    return r;
  },
};

// ---------- Merchant API công khai ----------

export const api = {
  async json(url, init) {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init });
    return { status: res.status, body: await res.json().catch(() => null) };
  },
  campaign: (shop, shopifyProductId) => api.json(`${cfg.api}/api/merchant/campaigns/${shopifyProductId}.json?shop=${cfg.stores[shop] || shop}`),
  customization: (shop, uuid) => api.json(`${cfg.api}/api/merchant/shopify/customization/${uuid}?shop=${cfg.stores[shop] || shop}`),
};

// ---------- Mạng ----------

export const net = {
  /** Ghi mọi request khớp pattern (status, thời gian, body request rút gọn). Trả mảng sống. */
  capture(page, pattern = /teeinblue|ownego/) {
    const out = [];
    page.on('requestfinished', async req => {
      if (!pattern.test(req.url())) return;
      const res = await req.response().catch(() => null);
      const t = req.timing();
      out.push({ method: req.method(), url: req.url().split('?')[0], status: res?.status() ?? null, ms: Math.round(t.responseEnd), body: req.postData()?.slice(0, 500) || null });
    });
    page.on('requestfailed', req => {
      if (pattern.test(req.url())) out.push({ method: req.method(), url: req.url().split('?')[0], status: null, failure: req.failure()?.errorText });
    });
    return out;
  },

  /** Giả lập mạng chậm qua CDP (đã verify). preset: slow3g | fast3g | offline | {latency, down, up} (bytes/s). */
  async throttle(page, preset = 'slow3g') {
    const P = { slow3g: { latency: 400, down: 50_000, up: 50_000 }, fast3g: { latency: 150, down: 200_000, up: 94_000 }, offline: { offline: true, latency: 0, down: -1, up: -1 } };
    const c = typeof preset === 'string' ? P[preset] : preset;
    const s = await page.context().newCDPSession(page);
    await s.send('Network.enable');
    await s.send('Network.emulateNetworkConditions', { offline: !!c.offline, latency: c.latency, downloadThroughput: c.down, uploadThroughput: c.up });
    return async () => s.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  },

  /** Trả lỗi giả cho request khớp pattern (đã verify): {status, body} hoặc {abort: 'failed'}. Trả hàm gỡ. */
  async fail(page, pattern, { status = 500, body = '{"message":"QA injected"}', abort } = {}) {
    const handler = route => (abort ? route.abort(abort) : route.fulfill({ status, contentType: 'application/json', body }));
    await page.route(pattern, handler);
    return () => page.unroute(pattern, handler);
  },
};
