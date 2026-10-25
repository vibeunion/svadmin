import { test, expect } from '@playwright/test';

test.describe('date/time keyboard', () => {
  test('keyboard can Tab into TimePicker and ArrowUp edits a segment with a consistent binding', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const before = fixture.getByTestId('before-time');
    const time = fixture.getByLabel('Keyboard time', { exact: true });

    await before.focus();
    await expect(before).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(time).toBeFocused();
    await expect(time).toHaveValue('09:30');
    await expect(fixture.getByTestId('time-bound')).toHaveText('09:30');
    await expect(fixture.getByTestId('time-changes')).toHaveText('0');

    await page.keyboard.press('ArrowUp');
    await expect(time).toHaveValue('10:30');
    await expect(fixture.getByTestId('time-bound')).toHaveText('10:30');
    await expect(fixture.getByTestId('time-changes')).toHaveText('1');
  });

  test('keyboard can Tab into DateTimePicker and ArrowUp edits a segment with a consistent binding', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const before = fixture.getByTestId('before-datetime');
    const datetime = fixture.getByLabel('Keyboard datetime', { exact: true });

    await before.focus();
    await expect(before).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(datetime).toBeFocused();
    await expect(datetime).toHaveValue('2026-09-21T09:30');
    await expect(fixture.getByTestId('datetime-bound')).toHaveText('2026-09-21T09:30');
    await expect(fixture.getByTestId('datetime-changes')).toHaveText('0');

    await page.keyboard.press('ArrowUp');
    // 原生分段顺序因引擎而异（Chromium/Firefox 先改月份，WebKit 先改年份），
    // 因此只断言值确实改变、绑定与输入一致，不把某个引擎的分段顺序写成契约。
    await expect(datetime).not.toHaveValue('2026-09-21T09:30');
    const edited = await datetime.inputValue();
    await expect(fixture.getByTestId('datetime-bound')).toHaveText(edited);
    await expect(fixture.getByTestId('datetime-changes')).toHaveText('1');
  });

  test('deleting the time hour segment and refilling with real keys preserves minutes and syncs binding with FormData', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const time = fixture.getByLabel('Keyboard time', { exact: true });
    const datetime = fixture.getByLabel('Keyboard datetime', { exact: true });
    const bound = fixture.getByTestId('time-bound');
    const changes = fixture.getByTestId('time-changes');

    await fixture.getByTestId('before-time').focus();
    await page.keyboard.press('Tab');
    await expect(time).toBeFocused();
    await expect(time).toHaveValue('09:30');
    await expect(bound).toHaveText('09:30');
    await expect(changes).toHaveText('0');

    // 真实删除键先删掉小时分段：原生输入值变为空字符串，控件绑定同步为 null，
    // 但分钟分段的内部状态仍由浏览器保留（原生 badInput 边界）。
    await page.keyboard.press('Backspace');
    await expect(time).toHaveValue('');
    await expect(bound).toHaveText('null');
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(true);

    // 真实键盘补回小时；修复版会丢弃其余分段，导致无法重建完整值。
    await page.keyboard.type('11');
    await expect(time).toHaveValue('11:30');
    await expect(bound).toHaveText('11:30');
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(false);
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(true);
    await expect(changes).not.toHaveText('0');

    await fixture.getByRole('button', { name: 'Submit keyboard form', exact: true }).click();
    await expect(fixture.getByTestId('keyboard-submits')).toHaveText('1');
    const payload = await fixture.getByTestId('keyboard-payload').textContent();
    expect(payload).not.toBeNull();
    const entries = JSON.parse(payload ?? '{}') as Record<string, string>;
    expect(entries.meetingTime).toBe(await time.inputValue());
    expect(entries.meetingTime).toBe('11:30');
    expect(entries.meetingAt).toBe(await datetime.inputValue());
    expect(entries.meetingAt).toBe('2026-09-21T09:30');
  });

  test('deleting the datetime month segment and refilling with real keys preserves year, day and time and syncs binding with FormData', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const time = fixture.getByLabel('Keyboard time', { exact: true });
    const datetime = fixture.getByLabel('Keyboard datetime', { exact: true });
    const bound = fixture.getByTestId('datetime-bound');
    const changes = fixture.getByTestId('datetime-changes');

    await fixture.getByTestId('before-datetime').focus();
    await page.keyboard.press('Tab');
    await expect(datetime).toBeFocused();
    await expect(datetime).toHaveValue('2026-09-21T09:30');
    await expect(bound).toHaveText('2026-09-21T09:30');
    await expect(changes).toHaveText('0');

    // 聚焦后原生 datetime-local 落在月份分段；删除月份使原生值变空，
    // 年份、日期与时间分段仍由浏览器内部保留。
    await page.keyboard.press('Backspace');
    await expect(datetime).toHaveValue('');
    await expect(bound).toHaveText('null');
    await expect.poll(() => datetime.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(true);

    await page.keyboard.type('11');
    await expect(datetime).toHaveValue('2026-11-21T09:30');
    await expect(bound).toHaveText('2026-11-21T09:30');
    await expect.poll(() => datetime.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(false);
    await expect.poll(() => datetime.evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(true);
    await expect(changes).not.toHaveText('0');

    await fixture.getByRole('button', { name: 'Submit keyboard form', exact: true }).click();
    await expect(fixture.getByTestId('keyboard-submits')).toHaveText('1');
    const payload = await fixture.getByTestId('keyboard-payload').textContent();
    expect(payload).not.toBeNull();
    const entries = JSON.parse(payload ?? '{}') as Record<string, string>;
    expect(entries.meetingAt).toBe(await datetime.inputValue());
    expect(entries.meetingAt).toBe('2026-11-21T09:30');
    expect(entries.meetingTime).toBe(await time.inputValue());
    expect(entries.meetingTime).toBe('09:30');
  });

  test('a partially cleared time keeps native badInput and cannot be submitted', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const time = fixture.getByLabel('Keyboard time', { exact: true });

    await fixture.getByTestId('before-time').focus();
    await page.keyboard.press('Tab');
    await expect(time).toBeFocused();

    // 只删小时，分钟分段尚未清空：原生 time 输入既没有完整 value，也仍处于
    // badInput 状态。这是原生边界记录，不是期望失败；未使用 test.fail/skip。
    await page.keyboard.press('Backspace');
    await expect(time).toHaveValue('');
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(true);
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(false);
    await expect(fixture.getByTestId('time-bound')).toHaveText('null');
    await expect(fixture.getByTestId('time-changes')).toHaveText('1');

    await fixture.getByRole('button', { name: 'Submit keyboard form', exact: true }).click();
    // 原生表单校验在部分分段为空时阻止提交，因此提交计数保持 0。
    await expect(fixture.getByTestId('keyboard-submits')).toHaveText('0');
    await expect(fixture.getByTestId('keyboard-payload')).toHaveText('null');
  });

  test('clearing every time segment with real keys allows submitting an empty value', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const time = fixture.getByLabel('Keyboard time', { exact: true });

    await fixture.getByTestId('before-time').focus();
    await page.keyboard.press('Tab');
    await expect(time).toBeFocused();

    // 三引擎一致：逐段删除小时和分钟需要三次真实 Backspace，中途以 ArrowRight
    // 移动分段；全部清空后 badInput 才消失，原生表单才接受空字符串。
    for (let step = 0; step < 3; step += 1) {
      await page.keyboard.press('Backspace');
      await page.keyboard.press('ArrowRight');
    }
    await expect(time).toHaveValue('');
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(false);
    await expect.poll(() => time.evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(true);
    await expect(fixture.getByTestId('time-bound')).toHaveText('null');

    await fixture.getByRole('button', { name: 'Submit keyboard form', exact: true }).click();
    await expect(fixture.getByTestId('keyboard-submits')).toHaveText('1');
    await expect(fixture.getByTestId('keyboard-payload')).toHaveText('{"meetingTime":"","meetingAt":"2026-09-21T09:30"}');
  });

  test('clearing every datetime segment with real keys leaves time intact and submits an empty meetingAt', async ({ page }) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const datetime = fixture.getByLabel('Keyboard datetime', { exact: true });
    const time = fixture.getByLabel('Keyboard time', { exact: true });

    await fixture.getByTestId('before-datetime').focus();
    await page.keyboard.press('Tab');
    await expect(datetime).toBeFocused();
    await expect(datetime).toHaveValue('2026-09-21T09:30');

    // 真实 Tab 聚焦后逐段删除 datetime 的年/月/日/时/分等原生分段，中途用
    // ArrowRight 移动；不做全选假设、不用 fill/evaluate 写值。
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Backspace');
      await page.keyboard.press('ArrowRight');
    }
    await expect(datetime).toHaveValue('');
    await expect(fixture.getByTestId('datetime-bound')).toHaveText('null');
    await expect.poll(() => datetime.evaluate(el => (el as HTMLInputElement).validity.badInput)).toBe(false);
    await expect.poll(() => datetime.evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(true);

    // 只清空 datetime，不应影响独立的 TimePicker。
    await expect(time).toHaveValue('09:30');
    await expect(fixture.getByTestId('time-bound')).toHaveText('09:30');

    await fixture.getByRole('button', { name: 'Submit keyboard form', exact: true }).click();
    await expect(fixture.getByTestId('keyboard-submits')).toHaveText('1');
    await expect(fixture.getByTestId('keyboard-payload')).toHaveText('{"meetingTime":"09:30","meetingAt":""}');
  });

  test('disabled pickers are skipped by Tab, ignore keyboard input and stay out of FormData', async ({ page }, testInfo) => {
    await page.goto('/?view=date-time-keyboard');
    const fixture = page.getByTestId('date-time-keyboard-fixture');
    const before = fixture.getByTestId('before-locked');
    const lockedTime = fixture.getByLabel('Locked time', { exact: true });
    const lockedDatetime = fixture.getByLabel('Locked datetime', { exact: true });

    await expect(lockedTime).toBeDisabled();
    await expect(lockedDatetime).toBeDisabled();

    await before.focus();
    await page.keyboard.press('Tab');
    await expect(lockedTime).not.toBeFocused();
    await expect(lockedDatetime).not.toBeFocused();
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      return {
        tagName: element?.tagName ?? null,
        testId: element instanceof HTMLElement ? element.dataset.testid ?? null : null,
      };
    });
    // 原生 Tab 遍历差异：Chromium/Firefox 移到后置按钮，WebKit 离开文档落到 BODY。
    if (testInfo.project.name.startsWith('webkit')) {
      expect(active.tagName).toBe('BODY');
    } else {
      expect(active.testId).toBe('after-locked');
    }

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    // WebKit 在 BODY 上的 Backspace 是历史后退而不是输入清空；禁用控件已失焦，
    // 该键在原生命中不适用，因此键盘输入仍以 ArrowUp/Enter 验证。
    if (!testInfo.project.name.startsWith('webkit')) await page.keyboard.press('Backspace');
    await expect(lockedTime).toHaveValue('08:00');
    await expect(lockedDatetime).toHaveValue('2026-09-21T08:00');
    await expect(fixture.getByTestId('locked-time-bound')).toHaveText('08:00');
    await expect(fixture.getByTestId('locked-datetime-bound')).toHaveText('2026-09-21T08:00');
    await expect(fixture.getByTestId('locked-changes')).toHaveText('0');

    await fixture.getByRole('button', { name: 'Submit keyboard form', exact: true }).click();
    await expect(fixture.getByTestId('keyboard-submits')).toHaveText('1');
    await expect(fixture.getByTestId('keyboard-payload')).toHaveText('{"meetingTime":"09:30","meetingAt":"2026-09-21T09:30"}');
  });
});