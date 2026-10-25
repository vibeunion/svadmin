import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=radio-group');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function formData(form: Locator): Promise<Record<string, string[]>> {
  return form.evaluate((element) => {
    const data = new FormData(element as HTMLFormElement);
    const result: Record<string, string[]> = {};
    for (const key of new Set(data.keys())) result[key] = data.getAll(key).map(String);
    return result;
  });
}

async function checkValidity(form: Locator): Promise<boolean> {
  return form.evaluate(element => (element as HTMLFormElement).checkValidity());
}

async function resetForm(form: Locator): Promise<void> {
  await form.evaluate(async element => {
    (element as HTMLFormElement).reset();
    // 组件在 reset 事件后以 setTimeout(0) 冲刷；在同一页面任务里排队等待，
    // 可确定性地等组件完成后再继续，而不是猜测固定时长。
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
}

async function realClickText(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Missing click target bounds');
  await locator.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('RadioGroup keeps unique labels across named and unnamed instances', async ({ page }) => {
  const fixture = page.getByTestId('radio-group-fixture');
  const inputs = fixture.locator('[data-svadmin-radio-group] input[type="radio"]');
  const count = await inputs.count();
  expect(count).toBeGreaterThan(0);
  const identities = await inputs.evaluateAll(elements => elements.map(input => ({
    id: input.id,
    labels: [...(input as HTMLInputElement).labels ?? []].map(label => label.control === input),
  })));
  expect(new Set(identities.map(item => item.id)).size).toBe(identities.length);
  for (const identity of identities) {
    expect(identity.id).not.toBe('');
    expect(identity.labels.length).toBeGreaterThan(0);
    expect(identity.labels.every(Boolean)).toBe(true);
  }
});

test('RadioGroup named forms serialize exact values and block empty required submits', async ({ page }) => {
  const firstForm = page.getByRole('form', { name: 'Named first form' });
  const secondForm = page.getByRole('form', { name: 'Named second form' });
  const firstSubmit = firstForm.getByRole('button', { name: 'Submit named first' });
  const secondSubmit = secondForm.getByRole('button', { name: 'Submit named second' });

  expect(await checkValidity(firstForm)).toBe(false);
  await firstSubmit.click();
  await expect(page.getByTestId('named-first-submissions')).toHaveText('0');
  expect(await formData(secondForm)).toEqual({});

  await realClickText(firstForm.getByText('Personal', { exact: true }));
  await realClickText(secondForm.getByText('Company', { exact: true }));
  await expect(firstForm.getByRole('radio', { name: /Personal/ })).toBeChecked();
  await expect(secondForm.getByRole('radio', { name: 'Company' })).toBeChecked();
  await expect(page.getByTestId('named-first-changes')).toHaveText('1');
  await expect(page.getByTestId('named-second-changes')).toHaveText('1');
  expect(await formData(firstForm)).toEqual({ visibility: ['personal'] });
  expect(await formData(secondForm)).toEqual({ visibility: ['company'] });

  await firstSubmit.click();
  await secondSubmit.click();
  await expect(page.getByTestId('named-first-submissions')).toHaveText('1');
  await expect(page.getByTestId('named-second-submissions')).toHaveText('1');
});

test('RadioGroup unnamed required group validates after selecting its own value', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Unnamed shared form' });
  const first = form.getByRole('group', { name: 'Unnamed required visibility' });
  const second = form.getByRole('group', { name: 'Unnamed second visibility' });
  const submit = form.getByRole('button', { name: 'Submit unnamed' });

  expect(await checkValidity(form)).toBe(false);
  await submit.click();
  await expect(page.getByTestId('unnamed-submissions')).toHaveText('0');

  const personal = first.getByRole('radio', { name: /Personal/ });
  await personal.focus();
  await personal.press('ArrowDown');
  await expect(first.getByRole('radio', { name: 'Company' })).toBeChecked();
  await expect(page.getByTestId('unnamed-first-value')).toHaveText('company');
  await expect(page.getByTestId('unnamed-first-changes')).toHaveText('1');
  await expect(second.getByRole('radio', { name: 'Company' })).toBeChecked();
  await expect(page.getByTestId('unnamed-second-changes')).toHaveText('0');
  expect(await formData(form)).toEqual({});

  expect(await checkValidity(form)).toBe(true);
  await submit.click();
  await expect(page.getByTestId('unnamed-submissions')).toHaveText('1');
});

test('RadioGroup unnamed keyboard and Tab stay inside the current group', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Unnamed shared form' });
  const first = form.getByRole('group', { name: 'Unnamed required visibility' });
  const second = form.getByRole('group', { name: 'Unnamed second visibility' });
  const personal = first.getByRole('radio', { name: /Personal/ });
  const company = first.getByRole('radio', { name: 'Company' });
  const secondCompany = second.getByRole('radio', { name: 'Company' });

  await secondCompany.click();
  expect(await first.locator('input[type="radio"][tabindex="0"]').count()).toBe(1);
  expect(await second.locator('input[type="radio"][tabindex="0"]').count()).toBe(1);
  await personal.focus();
  await page.keyboard.press('Tab');
  await expect(secondCompany).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(personal).toBeFocused();

  await personal.press('ArrowDown');
  await expect(company).toBeFocused();
  await expect(company).toBeChecked();
  await company.press('ArrowDown');
  await expect(personal).toBeFocused();
  await expect(personal).toBeChecked();
  await personal.press('End');
  await expect(company).toBeFocused();
  await expect(company).toBeChecked();
  await expect(first.getByRole('radio', { name: 'Team' })).not.toBeFocused();
  await expect(secondCompany).toBeChecked();
  await expect(page.getByTestId('unnamed-first-changes')).toHaveText('3');
  await expect(page.getByTestId('unnamed-second-changes')).toHaveText('0');
});

test('RadioGroup RTL unnamed arrows reverse horizontally but keep vertical order', async ({ page }) => {
  const group = page.getByRole('group', { name: 'RTL visibility' });
  const company = group.getByRole('radio', { name: 'Company' });
  const personal = group.getByRole('radio', { name: /Personal/ });
  const department = group.getByRole('radio', { name: 'Department' });

  await company.focus();
  await company.press('ArrowRight');
  await expect(personal).toBeFocused();
  await expect(personal).toBeChecked();
  await personal.press('ArrowLeft');
  await expect(company).toBeFocused();
  await expect(company).toBeChecked();
  await company.press('ArrowDown');
  await expect(department).toBeFocused();
  await expect(department).toBeChecked();
  await expect(page.getByTestId('rtl-value')).toHaveText('department');
  await expect(page.getByTestId('rtl-changes')).toHaveText('3');
});

test('RadioGroup disabled groups keep values and stay recoverable', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Disabled form' });
  const group = form.getByRole('group', { name: 'Disabled visibility', exact: true });
  const outer = form.getByRole('group', { name: 'Outer disabled visibility', exact: true });

  await realClickText(group.getByText('Company', { exact: true }));
  await realClickText(outer.getByText('Company', { exact: true }));
  await expect(page.getByTestId('disabled-value')).toHaveText('personal');
  await expect(page.getByTestId('outer-value')).toHaveText('personal');
  await expect(page.getByTestId('disabled-changes')).toHaveText('0');
  await expect(page.getByTestId('outer-changes')).toHaveText('0');

  await form.getByRole('button', { name: 'Submit disabled' }).click();
  await expect(page.getByTestId('disabled-submissions')).toHaveText('1');
  expect(await formData(form)).toEqual({});

  await page.getByRole('button', { name: 'Toggle group disabled' }).click();
  await page.getByRole('button', { name: 'Toggle outer disabled' }).click();
  await group.getByRole('radio', { name: 'Company' }).click();
  await outer.getByRole('radio', { name: 'Company' }).click();
  await expect(page.getByTestId('disabled-value')).toHaveText('company');
  await expect(page.getByTestId('outer-value')).toHaveText('company');
  await expect(page.getByTestId('disabled-changes')).toHaveText('1');
  await expect(page.getByTestId('outer-changes')).toHaveText('1');

  await form.getByRole('button', { name: 'Submit disabled' }).click();
  await expect(page.getByTestId('disabled-submissions')).toHaveText('2');
  expect(await formData(form)).toEqual({
    disabled_visibility: ['company'],
    outer_visibility: ['company'],
  });
});

test('RadioGroup parent clear and assignment do not emit extra onchange', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Parent visibility' });
  await page.getByRole('button', { name: 'Set parent company' }).click();
  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(group.getByRole('radio', { name: 'Company' })).toBeChecked();
  await expect(page.getByTestId('parent-changes')).toHaveText('0');

  await page.getByRole('button', { name: 'Clear parent value' }).click();
  await expect(page.getByTestId('parent-value')).toHaveText('null');
  await expect(group.getByRole('radio', { name: 'Company' })).not.toBeChecked();
  await expect(page.getByTestId('parent-changes')).toHaveText('0');

  await group.getByRole('radio', { name: 'Company' }).click();
  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(page.getByTestId('parent-changes')).toHaveText('1');
  await page.getByRole('button', { name: 'Clear parent value' }).click();
  await expect(page.getByTestId('parent-changes')).toHaveText('1');
});

test('RadioGroup Tab does not skip an editable boundary between unnamed groups', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Editable boundary form' });
  const first = form.getByRole('group', { name: 'Editable boundary first' });
  const second = form.getByRole('group', { name: 'Editable boundary second' });
  const editable = form.locator('[contenteditable="true"]');

  await first.getByRole('radio', { name: /Personal/ }).focus();
  await page.keyboard.press('Tab');
  await expect(editable).toBeFocused();
  await expect(second.locator('input[type="radio"][tabindex="0"]')).not.toBeFocused();
});

test('RadioGroup Tab skips inert adjacent radios without trapping focus', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Inert boundary form' });
  const first = form.getByRole('group', { name: 'Inert boundary first' });
  const second = form.getByRole('group', { name: 'Inert boundary second' });
  const inertRadio = form.locator('input[aria-label="Inert adjacent radio"]');

  await first.getByRole('radio', { name: /Personal/ }).focus();
  await page.keyboard.press('Tab');
  await expect(second.locator('input[type="radio"][tabindex="0"]')).toBeFocused();
  await expect(inertRadio).not.toBeFocused();
});

test('RadioGroup Tab lands on an aria-disabled host button between unnamed groups', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Host focus boundary form' });
  const first = form.getByRole('group', { name: 'Host boundary first' });
  const second = form.getByRole('group', { name: 'Host boundary second' });
  const hostButton = form.getByRole('button', { name: 'Host boundary action' });

  await expect(hostButton).toHaveAttribute('aria-disabled', 'true');
  expect(await hostButton.evaluate(button => (button as HTMLButtonElement).disabled)).toBe(false);
  await first.getByRole('radio', { name: /Personal/ }).focus();
  await page.keyboard.press('Tab');
  await expect(hostButton).toBeFocused();
  await expect(second.locator('input[type="radio"][tabindex="0"]')).not.toBeFocused();
});

test('RadioGroup empty name groups behave like unnamed groups for Tab', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Empty name shared form' });
  const first = form.getByRole('group', { name: 'Empty name first' });
  const second = form.getByRole('group', { name: 'Empty name second' });

  await first.getByRole('radio', { name: /Personal/ }).focus();
  await page.keyboard.press('Tab');
  await expect(second.getByRole('radio', { name: /Personal/ })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(first.getByRole('radio', { name: /Personal/ })).toBeFocused();
});

test('RadioGroup Tab keeps narrow-screen keyboard focus in the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.endsWith('-desktop'), '仅验证窄屏焦点可见性');
  const form = page.getByRole('form', { name: 'Empty name shared form' });
  const first = form.getByRole('group', { name: 'Empty name first' });
  const second = form.getByRole('group', { name: 'Empty name second' });
  const firstRadio = first.getByRole('radio', { name: /Personal/ });
  const secondRadio = second.getByRole('radio', { name: /Personal/ });

  await firstRadio.evaluate(element => element.focus());
  await page.evaluate(() => {
    const secondGroup = [...document.querySelectorAll<HTMLElement>('[data-svadmin-radio-group]')]
      .find(group => group.getAttribute('aria-label') === null
        && group.querySelector('legend')?.textContent === 'Empty name second');
    const input = secondGroup?.querySelector<HTMLInputElement>('input[type="radio"]');
    if (!input) throw new Error('Missing second empty-name radio');
    const delta = innerHeight - input.getBoundingClientRect().top + 24;
    window.scrollBy(0, -delta);
  });
  expect((await secondRadio.boundingBox())?.y ?? 0).toBeGreaterThan(page.viewportSize()?.height ?? 0);

  await firstRadio.evaluate(element => element.focus());
  await page.keyboard.press('Tab');
  await expect(secondRadio).toBeFocused();
  const box = await secondRadio.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('Missing focus bounds');
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
});

test('RadioGroup unnamed required stays invalid after an outer disabled fieldset is restored', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Outer required form' });
  const group = form.getByRole('group', { name: 'Outer required visibility' });
  const personal = group.getByRole('radio', { name: /Personal/ });

  await expect(personal).toBeDisabled();
  await page.getByRole('button', { name: 'Toggle outer required disabled' }).click();
  await expect(personal).toBeEnabled();
  expect(await checkValidity(form)).toBe(false);
  const validity = await personal.evaluate(input => ({
    customError: (input as HTMLInputElement).validity.customError,
    message: (input as HTMLInputElement).validationMessage,
  }));
  expect(validity.customError).toBe(true);
  expect(validity.message.length).toBeGreaterThan(0);

  await group.getByRole('radio', { name: 'Company' }).click();
  await expect(page.getByTestId('outer-required-value')).toHaveText('company');
  expect(await checkValidity(form)).toBe(true);
});

test('RadioGroup native reset restores initial selections and bindings without user changes', async ({ page }) => {
  const parentForm = page.getByRole('form', { name: 'Parent form' });
  const parent = parentForm.getByRole('group', { name: 'Parent visibility' });
  await parent.getByRole('radio', { name: 'Company' }).click();
  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(page.getByTestId('parent-changes')).toHaveText('1');
  expect(await formData(parentForm)).toEqual({ parent_visibility: ['company'] });
  await resetForm(parentForm);
  await expect(page.getByTestId('parent-value')).toHaveText('personal');
  await expect(parent.getByRole('radio', { name: /Personal/ })).toBeChecked();
  await expect(parent.getByRole('radio', { name: 'Company' })).not.toBeChecked();
  await expect(page.getByTestId('parent-changes')).toHaveText('1');
  expect(await formData(parentForm)).toEqual({ parent_visibility: ['personal'] });

  const namedForm = page.getByRole('form', { name: 'Named first form' });
  const named = namedForm.getByRole('group', { name: 'Named first visibility' });
  await named.getByRole('radio', { name: /Personal/ }).click();
  await expect(page.getByTestId('named-first-value')).toHaveText('personal');
  await expect(page.getByTestId('named-first-changes')).toHaveText('1');
  expect(await formData(namedForm)).toEqual({ visibility: ['personal'] });

  await resetForm(namedForm);
  await expect(page.getByTestId('named-first-value')).toHaveText('null');
  await expect(named.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(page.getByTestId('named-first-changes')).toHaveText('1');
  expect(await formData(namedForm)).toEqual({});
  expect(await checkValidity(namedForm)).toBe(false);

  const unnamedForm = page.getByRole('form', { name: 'Unnamed shared form' });
  const unnamedFirst = unnamedForm.getByRole('group', { name: 'Unnamed required visibility' });
  const unnamedSecond = unnamedForm.getByRole('group', { name: 'Unnamed second visibility' });
  await unnamedFirst.getByRole('radio', { name: /Personal/ }).click();
  await unnamedSecond.getByRole('radio', { name: /Personal/ }).click();
  await expect(page.getByTestId('unnamed-first-value')).toHaveText('personal');
  await expect(page.getByTestId('unnamed-second-value')).toHaveText('personal');
  await expect(page.getByTestId('unnamed-first-changes')).toHaveText('1');
  await expect(page.getByTestId('unnamed-second-changes')).toHaveText('1');
  expect(await formData(unnamedForm)).toEqual({});

  await resetForm(unnamedForm);
  await expect(page.getByTestId('unnamed-first-value')).toHaveText('null');
  await expect(page.getByTestId('unnamed-second-value')).toHaveText('company');
  await expect(unnamedFirst.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(unnamedSecond.getByRole('radio', { name: 'Company' })).toBeChecked();
  await expect(page.getByTestId('unnamed-first-changes')).toHaveText('1');
  await expect(page.getByTestId('unnamed-second-changes')).toHaveText('1');
  expect(await formData(unnamedForm)).toEqual({});
  expect(await checkValidity(unnamedForm)).toBe(false);
});

test('RadioGroup native reset keeps current values when reset is prevented', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Parent form' });
  const group = form.getByRole('group', { name: 'Parent visibility' });
  await group.getByRole('radio', { name: 'Company' }).click();
  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(page.getByTestId('parent-changes')).toHaveText('1');

  await form.evaluate(element => element.addEventListener('reset', event => event.preventDefault()));
  await resetForm(form);

  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(group.getByRole('radio', { name: 'Company' })).toBeChecked();
  await expect(group.getByRole('radio', { name: /Personal/ })).not.toBeChecked();
  await expect(page.getByTestId('parent-changes')).toHaveText('1');
  expect(await formData(form)).toEqual({ parent_visibility: ['company'] });
});

test('RadioGroup native reset followed by same-task selection keeps the last user choice', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Parent form' });
  const group = form.getByRole('group', { name: 'Parent visibility' });
  const company = group.getByRole('radio', { name: 'Company' });
  const personal = group.getByRole('radio', { name: /Personal/ });

  await company.click();
  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(company).toBeChecked();
  await expect(page.getByTestId('parent-changes')).toHaveText('1');

  await form.evaluate(async element => {
    const htmlForm = element as HTMLFormElement;
    htmlForm.reset();
    const next = htmlForm.querySelector<HTMLInputElement>('input[value="company"]');
    if (!next) throw new Error('Missing company radio');
    // reset 后同一任务内立即重新选择；组件的延迟 reset 冲刷不得覆盖它。
    next.click();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await expect(page.getByTestId('parent-value')).toHaveText('company');
  await expect(company).toBeChecked();
  await expect(personal).not.toBeChecked();
  await expect(page.getByTestId('parent-changes')).toHaveText('1');
  expect(await formData(form)).toEqual({ parent_visibility: ['company'] });
});

test('RadioGroup native reset rebuilds named and unnamed required validity', async ({ page }) => {
  const namedForm = page.getByRole('form', { name: 'Named first form' });
  const named = namedForm.getByRole('group', { name: 'Named first visibility' });
  const namedPersonal = named.getByRole('radio', { name: /Personal/ });
  expect(await checkValidity(namedForm)).toBe(false);
  await namedPersonal.click();
  expect(await checkValidity(namedForm)).toBe(true);
  await resetForm(namedForm);
  await expect(page.getByTestId('named-first-value')).toHaveText('null');
  expect(await checkValidity(namedForm)).toBe(false);
  expect(await namedPersonal.evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
  await expect(page.getByTestId('named-first-changes')).toHaveText('1');

  const unnamedForm = page.getByRole('form', { name: 'Unnamed shared form' });
  const unnamedFirst = unnamedForm.getByRole('group', { name: 'Unnamed required visibility' });
  const unnamedPersonal = unnamedFirst.getByRole('radio', { name: /Personal/ });
  expect(await checkValidity(unnamedForm)).toBe(false);
  await unnamedPersonal.click();
  expect(await checkValidity(unnamedForm)).toBe(true);
  await resetForm(unnamedForm);
  await expect(page.getByTestId('unnamed-first-value')).toHaveText('null');
  expect(await checkValidity(unnamedForm)).toBe(false);
  expect(await unnamedPersonal.evaluate(input => (input as HTMLInputElement).validity.customError)).toBe(true);
  await expect(page.getByTestId('unnamed-first-changes')).toHaveText('1');
  expect(await formData(unnamedForm)).toEqual({});
});

test('RadioGroup fixture screenshots', async ({ page }, testInfo) => {
  const directory = resolve(process.cwd(), 'output/playwright/radio-group-browser-contract-20261022');
  mkdirSync(directory, { recursive: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(directory, `${testInfo.project.name}.png`), fullPage: true });
});
