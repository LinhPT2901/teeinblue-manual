/**
 * TIB-001 — kiem tra parity localStorage `teeinblue-customizations`:
 *   layer-XXXXXX  (raw textarea value)  vs  layer-XXXXXX-data.lines (text sau wrap)
 *
 * Dan vao DevTools Console tren trang product storefront, hoac chay qua
 * page.evaluate() trong Playwright.
 *
 * Hanh vi wrap engine (da verify tren staging-sdk 2026-08-25):
 *   - soft break = DUNG 1 space trong value bi thay bang "\n" trong lines
 *   - hard "\n" (user go Enter) duoc giu nguyen
 *   - KHONG cat giua tu: tu dai hon khung tran ra dong rieng
 *   - KHONG collapse whitespace: double space / space dau-cuoi / "\n" cuoi giu nguyen
 * => co the dung nguoc lai: gop cac visual line ve dung cac hard block cua value.
 */
function checkParity(value, lines) {
  if (typeof value !== 'string' || typeof lines !== 'string')
    return { ok: false, reason: `type mismatch: value=${typeof value} lines=${typeof lines}` };
  if (value === lines) return { ok: true, reason: 'identical (no wrap)' };

  const blocks = value.split('\n');   // hard block do user go Enter
  const visual = lines.split('\n');   // hard + soft
  let vi = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    let acc = visual[vi++];
    if (acc === undefined) return { ok: false, reason: `ran out of visual lines at block ${bi}` };
    while (acc !== blocks[bi]) {
      if (vi >= visual.length || acc.length > blocks[bi].length)
        return { ok: false, reason: `block ${bi} mismatch: got ${JSON.stringify(acc)} want ${JSON.stringify(blocks[bi])}` };
      acc += ' ' + visual[vi++];      // undo 1 soft break
    }
  }
  if (vi !== visual.length)
    return { ok: false, reason: `${visual.length - vi} leftover visual line(s)` };
  return { ok: true, reason: 'wrap-only difference' };
}

/** Quet toan bo layer trong localStorage. Tra ve mang ket qua, in bang ra console. */
function auditCustomizations() {
  const arr = JSON.parse(localStorage.getItem('teeinblue-customizations') || '[]');
  const out = [];
  for (const entry of arr) {
    const c = entry.customization || {};
    for (const key of Object.keys(c)) {
      if (!key.endsWith('-data')) continue;
      const id = key.slice(0, -'-data'.length);
      const data = c[key];
      if (!data || typeof data.lines !== 'string') continue;   // chi paragraph layer co .lines
      if (!(id in c)) {                                        // field chua dung: khong co key raw
        out.push({ productId: entry.productId, id, ok: null, reason: 'raw key absent (field untouched)' });
        continue;
      }
      out.push({ productId: entry.productId, id, ...checkParity(c[id], data.lines) });
    }
  }
  console.table(out);
  return out;
}

if (typeof module !== 'undefined') module.exports = { checkParity, auditCustomizations };
