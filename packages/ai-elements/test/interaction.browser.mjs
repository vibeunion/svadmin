/** @param {import('@playwright/test').Page} page */
export default async function checkInteractions(page) {
  const results = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const logSelector = '[data-slot="conversation-content"]';
  const bottom = async () => page.waitForFunction((selector) => {
    const element = document.querySelector(selector);
    return element && element.clientHeight > 0 &&
      element.scrollHeight - element.clientHeight - element.scrollTop < 3;
  }, logSelector);

  for (const width of [1440, 1920, 390, 320]) {
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
      await page.goto(`http://127.0.0.1:5199/packages/ai-elements/test/interaction.html${dark ? '?dark' : ''}`);
      await page.getByRole('textbox', { name: 'Message', exact: true }).waitFor();
      await bottom();
      const log = page.locator(logSelector);
      const initialHeight = await log.evaluate((element) => element.scrollHeight);
      await page.getByRole('button', { name: 'Start stream', exact: true }).click();
      await page.waitForFunction(({ selector, height }) => document.querySelector(selector).scrollHeight > height + 100, { selector: logSelector, height: initialHeight });
      await page.getByRole('button', { name: 'Pause stream', exact: true }).click();
      await bottom();

      await log.hover();
      await page.mouse.wheel(0, -700);
      await page.getByRole('button', { name: 'Scroll to latest message' }).waitFor();
      await page.waitForTimeout(200);
      const readingTop = await log.evaluate((element) => element.scrollTop);
      await page.getByRole('button', { name: 'Start stream', exact: true }).click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'Pause stream', exact: true }).click();
      assert(Math.abs(await log.evaluate((element) => element.scrollTop) - readingTop) < 3, 'Streaming moved the reading position');
      await page.getByRole('button', { name: 'Scroll to latest message' }).click();
      await bottom();
      await page.getByRole('button', { name: 'Resize content', exact: true }).click();
      await bottom();

      const longCode = page.locator('pre').filter({ hasText: '// Line 24' });
      assert(await longCode.evaluate((element) => element.scrollWidth > element.clientWidth), 'Long code must scroll locally');
      assert((await longCode.textContent()).includes('long-value-'.repeat(45)), 'Long code content was corrupted');
      await longCode.evaluate((element) => { element.scrollLeft = 250; });
      assert(await longCode.evaluate((element) => element.scrollLeft > 0), 'Code cannot scroll horizontally');
      await longCode.evaluate((element) => { element.scrollLeft = 0; });
      await page.getByRole('button', { name: 'Copy code', exact: true }).last().click();
      assert((await page.evaluate(() => navigator.clipboard.readText())).includes('long-value-'.repeat(45)), 'Clipboard lost long code content');
      const table = page.getByRole('table');
      assert(await table.evaluate((element) => {
        let parent = element.parentElement;
        while (parent && !parent.matches('[data-slot="conversation-content"]')) {
          if (parent.scrollWidth > parent.clientWidth && ['auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) return true;
          parent = parent.parentElement;
        }
        return false;
      }), 'Wide table has no local scroll region');

      const tool = page.locator('[data-slot="tool"]');
      const header = page.locator('[data-slot="tool-header"]');
      await header.focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-slot="tool-input"]').waitFor();
      assert(await tool.evaluate((element) => element.open), 'Keyboard did not open tool');
      const parameters = page.getByRole('region', { name: 'Tool parameters' });
      if (await parameters.evaluate((element) => element.scrollHeight > element.clientHeight)) {
        await parameters.focus();
        await page.keyboard.press('ArrowDown');
        await page.waitForFunction(() => document.querySelector('[aria-label="Tool parameters"]').scrollTop > 0);
      }
      await page.getByRole('button', { name: 'Advance tool' }).click();
      await page.getByText('Running', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Advance tool' }).click();
      await page.getByText('Completed', { exact: true }).waitFor();
      await page.locator('[data-slot="tool-output"]').waitFor();
      await page.getByRole('button', { name: 'Advance tool' }).click();
      await page.getByText('Tool execution failed.', { exact: true }).waitFor();

      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${width}`);
      assert(await log.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), `Conversation overflow at ${width}`);

      const input = page.getByRole('textbox', { name: 'Message', exact: true });
      const submit = page.getByRole('button', { name: 'Submit', exact: true });
      assert(await submit.isDisabled(), 'Empty composed input allows submit');
      await input.fill('Draft for retry');
      await input.dispatchEvent('compositionstart');
      await input.press('Enter');
      assert((await page.getByRole('status', { name: 'Submission counts' }).textContent()).includes('0 sends'), 'IME composition submitted');
      await input.dispatchEvent('compositionend');
      await input.fill('Draft for retry');
      await input.press('Enter');
      await page.getByRole('alert').filter({ hasText: 'Send failed.' }).waitFor();
      assert(await input.inputValue() === 'Draft for retry', 'Failure lost the draft');
      await input.press('Enter');
      await page.getByRole('status', { name: 'Submission counts' }).filter({ hasText: '2 sends' }).waitFor();
      await page.waitForFunction(() => document.querySelector('[data-slot="prompt-input-textarea"]').value === '');
      await input.fill('Next draft');
      await input.press('Enter');
      await page.getByRole('button', { name: 'Stop', exact: true }).click();
      assert(await input.inputValue() === 'Next draft', 'Stop lost the next draft');
      assert((await page.getByRole('status', { name: 'Submission counts' }).textContent()).includes('2 sends, 1 stops'), 'Duplicate send or missing stop');
      await page.getByRole('button', { name: 'Use default input' }).click();
      const defaultInput = page.getByRole('textbox', { name: 'Message', exact: true });
      await defaultInput.fill('Default input request');
      await defaultInput.press('Enter');
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: 'Stop', exact: true }).click();
      assert((await page.getByRole('status', { name: 'Submission counts' }).textContent()).includes('3 sends, 2 stops'), 'Default input stop failed');

      await page.getByRole('button', { name: 'Open AI assistant' }).click();
      const chat = page.getByRole('region', { name: 'AI assistant', exact: true });
      await chat.getByRole('textbox').fill('Retry the conversation');
      await chat.getByRole('textbox').press('Enter');
      await chat.getByRole('button', { name: 'Retry response' }).click();
      await chat.getByRole('button', { name: 'Stop', exact: true }).click();
      await chat.getByText('aborted', { exact: true }).waitFor();
      await chat.getByRole('textbox').fill('Unsent draft');
      await chat.getByRole('button', { name: 'Retry response' }).click();
      await page.waitForFunction(() => {
        const chat = document.querySelector('[aria-label="AI assistant"]');
        return chat?.querySelector('[data-role="assistant"]')?.textContent?.includes('Chunk 30.');
      });
      assert(await chat.locator('[data-role="user"]').count() === 1, 'Retry duplicated user messages');
      assert(await chat.getByRole('textbox').inputValue() === 'Unsent draft', 'Retry discarded a new draft');
      assert(await chat.evaluate((element) => element.getBoundingClientRect().right <= innerWidth + 1), 'Chat dialog exceeds viewport');
      await page.screenshot({ path: `output/playwright/interaction-chat-${width}-${dark ? 'dark' : 'light'}.png` });
      await chat.getByRole('button', { name: 'Close AI assistant' }).click();

      await page.getByRole('button', { name: 'Resize content', exact: true }).click();
      if (await page.getByRole('button', { name: 'Scroll to latest message' }).count()) {
        await page.getByRole('button', { name: 'Scroll to latest message' }).click();
      }
      await bottom();
      await page.screenshot({ path: `output/playwright/interaction-${width}-${dark ? 'dark' : 'light'}.png` });
      results.push({ width, theme: dark ? 'dark' : 'light', passed: true });
    }
  }
  assert(errors.length === 0, errors.join('\n'));
  return results;
}
