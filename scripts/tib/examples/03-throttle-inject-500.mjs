export const meta = { id: 'EX-03', title: 'net.fail 500 customization + throttle bật/gỡ + validation' };
export default async ({ page, sf, net, check, note }) => {
  await sf.open(page, { handle: 'tib-5439-fix-ambiguous-order-item-activities-log-for-manual-sent-change-vs-confirm-send' });
  const restore = await net.throttle(page, { latency: 1500, down: -1, up: -1 });
  const time = async () => { const t = Date.now(); await page.evaluate(() => fetch('/cart.js', { cache: 'no-store' }).then(r => r.text())); return Date.now() - t; };
  const slow = await time(); await restore(); const fast = await time();
  check('throttle làm chậm rồi gỡ được', slow >= 1500 && fast < 1000, { slow, fast });
  const f = (await sf.fields(page)).find(x => x.id);
  note('field', f);
  if (f.required) {
    const v = await sf.addToCart(page, { timeout: 8000 });
    check('ATC trống bị validation chặn, báo đúng field', !v.ok && v.invalid?.fields?.some(x => x.id === f.id), v);
  }
  const unroute = await net.fail(page, /\/api\/merchant\/shopify\/customization\?/, { status: 500 });
  await sf.fill(page, f.id, 'QA inject');
  const atc = await sf.addToCart(page, { timeout: 15000 });
  note('atc', atc);
  check('ATC nhận 500 giả', atc.customization?.status === 500 && !atc.ok, atc);
  await unroute();
  const cart = await sf.cart(page);
  check('500 giả không tạo line trong cart', cart.item_count === 0, cart.item_count);
};
