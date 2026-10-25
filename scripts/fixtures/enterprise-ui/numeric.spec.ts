import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=numeric');
});

test('numeric inputs preserve null, zero, currency units, and percent scale', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const number = fixture.getByRole('spinbutton', { name: 'Number', exact: true });
  const money = fixture.getByRole('spinbutton', { name: 'Money', exact: true });
  const percent = fixture.getByRole('spinbutton', { name: 'Percent', exact: true });
  await number.fill('12');
  await expect(fixture.getByTestId('number-value')).toHaveText('12');
  await number.fill('');
  await expect(fixture.getByTestId('number-value')).toHaveText('null');
  await number.fill('0');
  await expect(fixture.getByTestId('number-value')).toHaveText('0');
  await money.fill('19.5');
  await expect(fixture.getByTestId('money-value')).toHaveText('19.5');
  await expect(money).toHaveValue('19.5');
  await percent.fill('25');
  await expect(fixture.getByTestId('percent-value')).toHaveText('0.25');
  await expect(percent).toHaveValue('25');
  await expect(fixture.getByTestId('numeric-changes')).toHaveText('5');
});

test('numeric inputs reflect parent updates without emitting input callbacks', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const number = fixture.getByRole('spinbutton', { name: 'Number', exact: true });
  const money = fixture.getByRole('spinbutton', { name: 'Money', exact: true });
  const percent = fixture.getByRole('spinbutton', { name: 'Percent', exact: true });
  await fixture.getByRole('button', { name: 'Set parent values', exact: true }).press('Enter');
  await expect(number).toHaveValue('0');
  await expect(money).toHaveValue('12.5');
  await expect(percent).toHaveValue('60');
  await expect(fixture.getByTestId('numeric-changes')).toHaveText('0');
  await fixture.getByRole('button', { name: 'Clear parent values', exact: true }).press('Space');
  await expect(number).toHaveValue('');
  await expect(money).toHaveValue('');
  await expect(percent).toHaveValue('');
  await expect(fixture.getByTestId('numeric-changes')).toHaveText('0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('numeric inputs locale formatting parses en-US typing and paste-like text without writing separators', async ({ page }) => {
  const fixture = page.getByTestId('numeric-locale-fixture');
  const number = fixture.getByRole('spinbutton', { name: 'Locale en number', exact: true });
  await expect(number).toHaveValue('1,234.50');
  await expect(number).toHaveAttribute('type', 'text');
  await expect(number).toHaveAttribute('lang', 'en-US');

  await number.focus();
  await number.fill('');
  await expect(fixture.getByTestId('locale-en-value')).toHaveText('null');
  await number.pressSequentially('1,234.5');
  await expect(fixture.getByTestId('locale-en-value')).toHaveText('1234.5');
  await number.blur();
  await expect(number).toHaveValue('1,234.50');

  await number.focus();
  await number.fill('2,345.75');
  await expect(fixture.getByTestId('locale-en-value')).toHaveText('2345.75');
  await number.fill('1.234,5');
  await expect(fixture.getByTestId('locale-en-value')).toHaveText('2345.75');
  await expect(fixture).not.toContainText('1.234,5');
  await expect(number).toHaveValue('1.234,5');
  await expect(number).toHaveAttribute('aria-invalid', 'true');
  await number.blur();
  await expect(number).toHaveValue('1.234,5');
  await number.focus();
  await number.fill('2,345.75');
  await expect(number).not.toHaveAttribute('aria-invalid', 'true');
  await number.blur();
  await expect(number).toHaveValue('2,345.75');
});

test('numeric inputs locale formatting handles de-DE money negatives and mixed input rejection', async ({ page }) => {
  const fixture = page.getByTestId('numeric-locale-fixture');
  const money = fixture.getByRole('spinbutton', { name: 'Locale de money', exact: true });
  await expect(money).toHaveValue('12,50');
  await expect(fixture).toContainText('EUR');

  await money.focus();
  await money.fill('1.234,50');
  await expect(fixture.getByTestId('locale-de-value')).toHaveText('1234.5');
  await money.blur();
  await expect(money).toHaveValue('1.234,50');

  await money.focus();
  await money.fill('-1.234,50');
  await expect(fixture.getByTestId('locale-de-value')).toHaveText('-1234.5');
  await money.blur();
  await expect(money).toHaveValue('-1.234,50');

  await money.focus();
  await money.fill('1,234.5');
  await expect(fixture.getByTestId('locale-de-value')).toHaveText('-1234.5');
  await expect(money).toHaveValue('1,234.5');
  await expect(money).toHaveAttribute('aria-invalid', 'true');
  await money.blur();
  await expect(money).toHaveValue('1,234.5');
  await money.focus();
  await money.fill('-1.234,50');
  await expect(money).not.toHaveAttribute('aria-invalid', 'true');
  await money.blur();
  await expect(money).toHaveValue('-1.234,50');
});

test('numeric inputs locale formatting keeps zh-CN percent scale, zero, and null distinct', async ({ page }) => {
  const fixture = page.getByTestId('numeric-locale-fixture');
  const percent = fixture.getByRole('spinbutton', { name: 'Locale zh percent', exact: true });
  await expect(percent).toHaveValue('25.0');

  await percent.focus();
  await percent.fill('25.5');
  await expect(fixture.getByTestId('locale-zh-value')).toHaveText('0.255');
  await percent.blur();
  await expect(percent).toHaveValue('25.5');

  await percent.focus();
  await percent.fill('0');
  await expect(fixture.getByTestId('locale-zh-value')).toHaveText('0');
  await percent.fill('');
  await expect(fixture.getByTestId('locale-zh-value')).toHaveText('null');
  await expect(fixture.getByTestId('locale-changes')).toHaveText('3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('numeric inputs locale native form submits normalized values, required null, and disabled omission', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const form = fixture.getByTestId('locale-native-form');
  const amount = form.getByRole('spinbutton', { name: 'Native amount', exact: true });
  const rate = form.getByRole('spinbutton', { name: 'Native percent', exact: true });
  await expect(amount).toHaveValue('1.234,50');
  await expect(rate).toHaveValue('25,5');
  await expect(form.locator('input[name="amount"]')).toHaveCount(1);
  await expect(form.locator('input[name="rate"]')).toHaveCount(1);

  const data = await form.evaluate(element => Object.fromEntries(new FormData(element as HTMLFormElement).entries()));
  expect(data).toEqual({ amount: '1234.5', rate: '0.255' });
  await form.getByRole('button', { name: 'Submit locale form', exact: true }).click();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"amount":"1234.5","rate":"0.255"}');

  const requiredForm = fixture.getByTestId('locale-required-form');
  await requiredForm.getByRole('button', { name: 'Submit required form', exact: true }).click();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');
  await requiredForm.getByRole('button', { name: 'Set required zero', exact: true }).click();
  await requiredForm.getByRole('button', { name: 'Submit required form', exact: true }).click();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('2');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"requiredAmount":"0"}');
});

test('numeric inputs locale blocks invalid mixed drafts until the user corrects them', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const form = fixture.getByTestId('locale-native-form');
  const amount = form.getByRole('spinbutton', { name: 'Native amount', exact: true });
  await amount.focus();
  await amount.fill('1,234.5');
  await expect(amount).toHaveValue('1,234.5');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  expect(await amount.evaluate(element => (element as HTMLInputElement).validationMessage)).not.toBe('');
  await form.evaluate(element => (element as HTMLFormElement).requestSubmit());
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');

  await amount.blur();
  await expect(amount).toHaveValue('1,234.5');
  await amount.focus();
  await amount.fill('1.500,25');
  await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
  await form.evaluate(element => (element as HTMLFormElement).requestSubmit());
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"amount":"1500.25","rate":"0.255"}');
});

test('numeric inputs clear stale locale drafts, reject unsupported locales, and compose before commit', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const lifecycle = fixture.getByTestId('locale-lifecycle-fixture');
  const switching = lifecycle.getByRole('spinbutton', { name: 'Switch locale number', exact: true });
  await expect(switching).toHaveValue('1.5');
  await switching.fill('1,234.5');
  await expect(lifecycle.getByTestId('switch-value')).toHaveText('1234.5');
  await lifecycle.getByRole('button', { name: 'Use de-DE', exact: true }).click();
  await expect(switching).toHaveValue('1.234,5');
  await expect(lifecycle.getByTestId('switch-value')).toHaveText('1234.5');

  const unsupported = lifecycle.getByRole('spinbutton', { name: 'Unsupported locale', exact: true });
  await expect(unsupported).toHaveAttribute('type', 'text');
  await expect(unsupported).toHaveAttribute('aria-invalid', 'true');
  expect(await unsupported.evaluate(element => (element as HTMLInputElement).validationMessage)).not.toBe('');

  const composed = fixture.getByRole('spinbutton', { name: 'Locale en number', exact: true });
  await composed.focus();
  await composed.evaluate(element => {
    const input = element as HTMLInputElement;
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '1,2';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '1,2', inputType: 'insertCompositionText' }));
  });
  await expect(fixture.getByTestId('locale-en-value')).toHaveText('1234.5');
  await composed.evaluate(element => {
    const input = element as HTMLInputElement;
    input.value = '2,345.75';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '2,345.75' }));
  });
  await expect(fixture.getByTestId('locale-en-value')).toHaveText('2345.75');
});

test('numeric inputs locale external min/max and non-finite values block native requestSubmit until valid', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const form = fixture.getByTestId('locale-boundary-form');
  const amount = form.getByRole('spinbutton', { name: 'Boundary amount', exact: true });
  const requestSubmit = () => form.evaluate(element => (element as HTMLFormElement).requestSubmit());
  await expect(amount).toHaveValue('11');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  expect(await amount.evaluate(element => (element as HTMLInputElement).validationMessage)).not.toBe('');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');
  await expect(fixture.getByTestId('boundary-changes')).toHaveText('0');

  await form.getByRole('button', { name: 'Set below min', exact: true }).click();
  await expect(amount).toHaveValue('-1');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');

  await amount.focus();
  await form.getByRole('button', { name: 'Set NaN', exact: true }).evaluate(element => (element as HTMLElement).click());
  await expect(amount).toHaveValue('');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('input[name="boundaryAmount"]')).toHaveValue('');
  await expect(form.locator('input[name="boundaryAmount"]')).toBeDisabled();
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');

  await form.getByRole('button', { name: 'Set infinity', exact: true }).evaluate(element => (element as HTMLElement).click());
  await expect(amount).toHaveValue('');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  expect(await amount.evaluate(element => (element as HTMLInputElement).validationMessage)).not.toBe('');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');

  await form.getByRole('button', { name: 'Set valid boundary', exact: true }).click();
  await expect(amount).toHaveValue('8');
  await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
  expect(await amount.evaluate(element => (element as HTMLInputElement).validationMessage)).toBe('');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"boundaryAmount":"8"}');
  await expect(fixture.getByTestId('boundary-changes')).toHaveText('0');
});

test('numeric inputs locale percent display overflow blocks submit until a valid value returns', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const form = fixture.getByTestId('locale-overflow-form');
  const rate = form.getByRole('spinbutton', { name: 'Overflow percent', exact: true });
  const requestSubmit = () => form.evaluate(element => (element as HTMLFormElement).requestSubmit());
  await expect(rate).toHaveValue('');
  await expect(rate).toHaveAttribute('aria-invalid', 'true');
  expect(await rate.evaluate(element => (element as HTMLInputElement).validationMessage)).not.toBe('');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');

  await form.getByRole('button', { name: 'Set valid percent', exact: true }).click();
  await expect(rate).toHaveValue('50');
  await expect(rate).not.toHaveAttribute('aria-invalid', 'true');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"overflowRate":"0.5"}');
  await expect(fixture.getByTestId('overflow-changes')).toHaveText('0');
});

test('numeric inputs locale composition blocks arrows and stale submits, then commits once or stays blocked', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const form = fixture.getByTestId('locale-composition-form');
  const amount = form.getByRole('spinbutton', { name: 'Composition amount', exact: true });
  const requestSubmit = () => form.evaluate(element => (element as HTMLFormElement).requestSubmit());
  await expect(amount).toHaveValue('5');
  await amount.focus();
  await amount.evaluate(element => {
    const input = element as HTMLInputElement;
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '1,2';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '1,2', inputType: 'insertCompositionText' }));
  });
  await amount.press('ArrowUp');
  await expect(fixture.getByTestId('composition-value')).toHaveText('5');
  await expect(fixture.getByTestId('composition-changes')).toHaveText('0');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('0');

  await amount.evaluate(element => {
    const input = element as HTMLInputElement;
    input.value = '6';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '6' }));
  });
  await expect(fixture.getByTestId('composition-value')).toHaveText('6');
  await expect(fixture.getByTestId('composition-changes')).toHaveText('1');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"compositionAmount":"6"}');

  await amount.evaluate(element => {
    const input = element as HTMLInputElement;
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '1,2';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '1,2', inputType: 'insertCompositionText' }));
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '1,2' }));
  });
  await expect(fixture.getByTestId('composition-changes')).toHaveText('1');
  await expect(amount).toHaveValue('1,2');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('1');

  await amount.fill('7');
  await expect(fixture.getByTestId('composition-value')).toHaveText('7');
  await expect(fixture.getByTestId('composition-changes')).toHaveText('2');
  await requestSubmit();
  await expect(fixture.getByTestId('locale-submissions')).toHaveText('2');
  await expect(fixture.getByTestId('locale-submitted')).toHaveText('{"compositionAmount":"7"}');
});

test('numeric inputs locale arrows keep any as spinbutton and preserve explicit smaller steps', async ({ page }) => {
  const fixture = page.getByTestId('numeric-fixture');
  const lifecycle = fixture.getByTestId('locale-lifecycle-fixture');
  const any = lifecycle.getByRole('spinbutton', { name: 'Arrow any number', exact: true });
  await expect(any).toHaveAttribute('step', 'any');
  await expect(any).toHaveAttribute('role', 'spinbutton');
  await any.focus();
  await any.press('ArrowUp');
  await expect(lifecycle.getByTestId('arrow-any-value')).toHaveText('3');

  const explicit = lifecycle.getByRole('spinbutton', { name: 'Arrow step number', exact: true });
  await expect(explicit).toHaveAttribute('step', '0.001');
  await explicit.focus();
  await explicit.press('ArrowUp');
  await expect(lifecycle.getByTestId('arrow-step-value')).toHaveText('1.23556');
});
