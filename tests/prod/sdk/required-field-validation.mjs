// ATC khi thiếu field bắt buộc bị chặn và báo đúng field.
export const meta = { id: 'SDK-required-field', title: 'Thiếu field bắt buộc → ATC bị chặn, báo đúng field', object: 'sdk', feature: 'storefront-buyer-facing', fixture: 'required-field', tasks: [], cases: [] };
export default async ({ page, sf, fx, check }) => {
  await sf.open(page, { store: fx.store, handle: fx.handle });
  const v = await sf.addToCart(page, { timeout: 10_000 });
  check('ATC bị chặn', !v.ok && !v.customization, v);
  check('báo đúng field bắt buộc', v.invalid?.fields?.some(f => f.id === fx.requiredField), v.invalid);
};
