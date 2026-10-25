import { test, expect, type Locator } from '@playwright/test';

for (const instant of [false, true]) {
  test(`date/time inputs preserve parent values in ${instant ? 'instant' : 'civil'} mode`, async ({ page }) => {
    await page.goto(`/?view=date-time${instant ? '&instant=1' : ''}`);
    const fixture = page.getByTestId('date-time-fixture');
    await fixture.getByRole('button', { name: 'Set parent values', exact: true }).press('Enter');
    await expect(fixture.getByLabel('Date', { exact: true })).toHaveValue('2026-09-21');
    await expect(fixture.getByLabel('Time', { exact: true })).toHaveValue('09:30');
    await expect(fixture.getByTestId('date-value')).toHaveText('2026-09-21');
    await expect(fixture.getByTestId('time-value')).toHaveText('09:30');
    await expect(fixture.getByTestId('range-value')).toHaveText('{"start":"2026-09-01","end":"2026-09-21"}');
    await fixture.getByRole('button', { name: 'Clear parent values', exact: true }).press('Space');
    await expect(fixture.getByLabel('Date', { exact: true })).toHaveValue('');
    await expect(fixture.getByLabel('Time', { exact: true })).toHaveValue('');
    await expect(fixture.getByTestId('date-value')).toHaveText('null');
    await expect(fixture.getByTestId('time-value')).toHaveText('null');
    await expect(fixture.getByTestId('datetime-value')).toHaveText('null');
    await expect(fixture.getByTestId('range-value')).toHaveText('null');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

async function expectCustomError(input: Locator, expected: boolean): Promise<void> {
  await expect.poll(() => input.evaluate(element => (element as HTMLInputElement).validity.customError)).toBe(expected);
}

test('date/time inputs policy: date disabledDate blocks invalid draft and native submit until corrected', async ({ page }) => {
  await page.goto('/?view=date-time&policy=1');
  const fixture = page.getByTestId('date-time-policy-fixture');
  const input = fixture.getByLabel('Policy date', { exact: true });
  const submit = fixture.getByRole('button', { name: 'Submit date', exact: true });

  await expect(input).toHaveValue('2026-09-18');
  await input.fill('2026-09-19');
  await expect(input).toHaveValue('2026-09-19');
  await expect(fixture.getByTestId('date-bound')).toHaveText('2026-09-18');
  await expect(fixture.getByTestId('date-onchanges')).toHaveText('0');
  await expectCustomError(input, true);
  await expect.poll(() => input.evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(false);

  await submit.click();
  await expect(fixture.getByTestId('date-submits')).toHaveText('0');
  await expect(fixture.getByTestId('date-payload')).toHaveText('null');

  await input.fill('2026-09-20');
  await expect(input).toHaveValue('2026-09-20');
  await expect(fixture.getByTestId('date-bound')).toHaveText('2026-09-20');
  await expect(fixture.getByTestId('date-onchanges')).toHaveText('1');
  await expectCustomError(input, false);
  await expect.poll(() => input.evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(true);

  await submit.click();
  await expect(fixture.getByTestId('date-submits')).toHaveText('1');
  await expect(fixture.getByTestId('date-payload')).toHaveText('{"booking":"2026-09-20"}');
});

test('date/time inputs policy: range rejects reversed draft and applies only an enabled preset atomically', async ({ page }) => {
  await page.goto('/?view=date-time&policy=1');
  const fixture = page.getByTestId('date-time-policy-fixture');
  const start = fixture.getByLabel('Policy range start', { exact: true });
  const end = fixture.getByLabel('Policy range end', { exact: true });
  const select = fixture.getByRole('combobox');
  const submit = fixture.getByRole('button', { name: 'Submit range', exact: true });

  await expect(start).toHaveValue('2026-09-10');
  await expect(end).toHaveValue('2026-09-20');
  await start.fill('2026-09-25');
  await expect(start).toHaveValue('2026-09-25');
  await expect(fixture.getByTestId('range-bound')).toHaveText('{"start":"2026-09-10","end":"2026-09-20"}');
  await expect(fixture.getByTestId('range-onchanges')).toHaveText('0');
  await expectCustomError(start, true);
  await expect.poll(() => start.evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(false);

  await submit.click();
  await expect(fixture.getByTestId('range-submits')).toHaveText('0');
  await expect(fixture.getByTestId('range-payload')).toHaveText('null');

  await start.fill('2026-09-15');
  await expect(start).toHaveValue('2026-09-15');
  await expect(end).toHaveValue('2026-09-20');
  await expect(fixture.getByTestId('range-bound')).toHaveText('{"start":"2026-09-15","end":"2026-09-20"}');
  await expect(fixture.getByTestId('range-onchanges')).toHaveText('1');
  await expectCustomError(start, false);

  await submit.click();
  await expect(fixture.getByTestId('range-submits')).toHaveText('1');
  await expect(fixture.getByTestId('range-payload')).toHaveText('{"period.start":"2026-09-15","period.end":"2026-09-20"}');

  await expect(select.locator('option', { hasText: 'Blocked day' })).toBeDisabled();
  await expect(select.locator('option', { hasText: 'Reversed' })).toBeDisabled();
  await expect(select.selectOption({ label: 'Blocked day' }, { timeout: 1_000 })).rejects.toThrow();
  await expect(select.selectOption({ label: 'Reversed' }, { timeout: 1_000 })).rejects.toThrow();
  await expect(select).toHaveValue('');
  await expect(fixture.getByTestId('range-onchanges')).toHaveText('1');
  await expect(fixture.getByTestId('range-bound')).toHaveText('{"start":"2026-09-15","end":"2026-09-20"}');

  await select.selectOption({ label: 'Working week' });
  await expect(start).toHaveValue('2026-09-14');
  await expect(end).toHaveValue('2026-09-18');
  await expect(fixture.getByTestId('range-bound')).toHaveText('{"start":"2026-09-14","end":"2026-09-18"}');
  await expect(fixture.getByTestId('range-onchanges')).toHaveText('2');

  await submit.click();
  await expect(fixture.getByTestId('range-submits')).toHaveText('2');
  await expect(fixture.getByTestId('range-payload')).toHaveText('{"period.start":"2026-09-14","period.end":"2026-09-18"}');
});

test('date/time inputs policy: Los Angeles gap and fold use deterministic UTC payloads', async ({ page }) => {
  await page.goto('/?view=date-time&policy=1');
  const fixture = page.getByTestId('date-time-policy-fixture');

  const gap = fixture.getByLabel('Gap instant', { exact: true });
  const gapSubmit = fixture.getByRole('button', { name: 'Submit gap', exact: true });
  await expect(gap).toHaveValue('2026-03-08T01:00');
  await gap.fill('2026-03-08T02:30');
  await expect(gap).toHaveValue('2026-03-08T02:30');
  await expect(fixture.getByTestId('gap-bound')).toHaveText('2026-03-08T09:00:00.000Z');
  await expect(fixture.getByTestId('gap-onchanges')).toHaveText('0');
  await expectCustomError(gap, true);
  await expect.poll(() => gap.evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(false);
  await gapSubmit.click();
  await expect(fixture.getByTestId('gap-submits')).toHaveText('0');
  await expect(fixture.getByTestId('gap-payload')).toHaveText('null');

  await gap.fill('2026-03-08T03:30');
  await expect(fixture.getByTestId('gap-bound')).toHaveText('2026-03-08T10:30:00.000Z');
  await expect(fixture.getByTestId('gap-onchanges')).toHaveText('1');
  await expectCustomError(gap, false);
  await gapSubmit.click();
  await expect(fixture.getByTestId('gap-submits')).toHaveText('1');
  await expect(fixture.getByTestId('gap-payload')).toHaveText('{"gapAt":"2026-03-08T10:30:00.000Z"}');

  const foldReject = fixture.getByLabel('Fold reject', { exact: true });
  await foldReject.fill('2026-11-01T01:30');
  await expect(foldReject).toHaveValue('2026-11-01T01:30');
  await expect(fixture.getByTestId('fold-reject-bound')).toHaveText('null');
  await expect(fixture.getByTestId('fold-reject-onchanges')).toHaveText('0');
  await expectCustomError(foldReject, true);
  await expect.poll(() => foldReject.evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(false);
  await fixture.getByRole('button', { name: 'Submit fold reject', exact: true }).click();
  await expect(fixture.getByTestId('fold-reject-submits')).toHaveText('0');
  await expect(fixture.getByTestId('fold-reject-payload')).toHaveText('null');

  const foldEarlier = fixture.getByLabel('Fold earlier', { exact: true });
  await foldEarlier.fill('2026-11-01T01:30');
  await expect(fixture.getByTestId('fold-earlier-bound')).toHaveText('2026-11-01T08:30:00.000Z');
  await expect(fixture.getByTestId('fold-earlier-onchanges')).toHaveText('1');
  await expectCustomError(foldEarlier, false);
  await fixture.getByRole('button', { name: 'Submit fold earlier', exact: true }).click();
  await expect(fixture.getByTestId('fold-earlier-submits')).toHaveText('1');
  await expect(fixture.getByTestId('fold-earlier-payload')).toHaveText('{"foldEarlierAt":"2026-11-01T08:30:00.000Z"}');

  const foldLater = fixture.getByLabel('Fold later', { exact: true });
  await foldLater.fill('2026-11-01T01:30');
  await expect(fixture.getByTestId('fold-later-bound')).toHaveText('2026-11-01T09:30:00.000Z');
  await expect(fixture.getByTestId('fold-later-onchanges')).toHaveText('1');
  await expectCustomError(foldLater, false);
  await fixture.getByRole('button', { name: 'Submit fold later', exact: true }).click();
  await expect(fixture.getByTestId('fold-later-submits')).toHaveText('1');
  await expect(fixture.getByTestId('fold-later-payload')).toHaveText('{"foldLaterAt":"2026-11-01T09:30:00.000Z"}');
});