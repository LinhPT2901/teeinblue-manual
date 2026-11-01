// Smoke luồng chính storefront: upload ảnh + điền text → ATC → cart + customization lưu đúng.
export const meta = { id: 'SMOKE-sdk-upload-atc', title: 'Upload + ATC: cart và customization lưu đúng', object: 'sdk', feature: 'storefront-buyer-facing', fixture: 'upload-atc', tasks: [], cases: [], smoke: true };
export default async ({ page, sf, api, fx, check }) => {
  await sf.open(page, { store: fx.store, handle: fx.handle });
  const up = await sf.upload(page, fx.photoField, fx.photo);
  check('upload thành công', up.requests.length > 0 && up.requests.every(r => r.status < 400), up.requests);
  await sf.fill(page, fx.textField, 'QA smoke');
  const atc = await sf.addToCart(page);
  check('ATC: customization + cart/add thành công', atc.ok, atc.customization?.status ?? atc.invalid);
  const line = (await sf.cart(page)).items.at(-1);
  check('cart line có customization + text đúng', !!line?.properties?._customization_id && line.properties[fx.textField] === 'QA smoke', line?.properties);
  const g = await api.customization(fx.store, line?.properties?._customization_id);
  check('customization đọc lại được, giữ đúng ảnh', g.status === 200 && JSON.stringify(g.body).includes('customers/uploads/'), g.status);
};
