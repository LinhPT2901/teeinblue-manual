export const meta = { id: 'EX-01', title: 'open + template + fill + storage + preview' };
export default async ({ page, sf, check, note, shot, evidencePath }) => {
  const o = await sf.open(page, { handle: 'refactor-paragraph' });
  note('open', o);
  note('bundle', await sf.bundle(page));
  const opts = await page.locator('.tee-field--template option').allInnerTexts();
  note('templates', opts);
  await sf.template(page, opts[1]);
  const fields = await sf.fields(page);
  note('fields', fields);
  const txt = fields.find(f => f.id && f.controls.some(c => /textarea|input:text/.test(c)));
  check('có field text', !!txt, txt);
  await sf.fill(page, txt.id, 'QA run.mjs hello');
  await sf.fill(page, txt.id, 'QA run.mjs hello');   // gõ lại: không được nối chuỗi
  const v = await page.locator(`.tee-field--layer-${txt.id}`).locator('textarea,input').first().inputValue();
  check('giá trị không bị nối', v === 'QA run.mjs hello', v);
  const cur = await sf.current(page);
  note('current keys', Object.keys(cur || {}));
  await shot('form');
  note('preview', await sf.previewSvg(page, evidencePath('preview')).catch(e => 'preview lỗi: ' + e.message));
};
