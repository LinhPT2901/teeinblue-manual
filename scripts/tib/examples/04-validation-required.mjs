export const meta = { id: 'EX-04', title: 'ATC thiếu field bắt buộc → báo đúng field' };
export default async ({ page, sf, check }) => {
  await sf.open(page, { handle: 'refactor-paragraph' });
  const v = await sf.addToCart(page, { timeout: 8000 });
  check('validation chặn, báo Song search', !v.ok && v.invalid.fields.some(f => f.id === '423450') && /required/.test(v.invalid.message), v);
};
