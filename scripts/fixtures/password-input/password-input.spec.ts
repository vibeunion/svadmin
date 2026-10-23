import { expect, test } from '@playwright/test';

for (const preset of ['default', 'clean-flat']) {
  for (const nested of [false, true]) {
    test(`${preset}, nested=${nested}: label, icons and keyboard remain usable`, async ({ page }, testInfo) => {
      await page.goto(`/?preset=${preset}&nested=${nested}`);
      const input = page.getByLabel('Password', { exact: true });
      for (const viewport of [
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 1280, height: 900 },
        { width: 1024, height: 900 },
        { width: 768, height: 900 },
        { width: 390, height: 900 },
      ]) {
        const { width, height } = viewport;
        await page.setViewportSize(viewport);
        for (const dir of ['ltr', 'rtl']) {
          await page.locator('[dir]').evaluate((element, value) => element.setAttribute('dir', value), dir);
          for (const state of ['empty', 'masked', 'visible']) {
            await input.fill(state === 'empty' ? '' : 'Layout-check-123!');
            if (state === 'visible') await page.getByRole('button', { name: 'Show password' }).click();
            const metrics = await input.evaluate((control) => {
              const field = control.closest('[data-svadmin-password-field]');
              const root = control.closest('[data-svadmin-password-input]');
              const icon = field?.querySelector('[data-svadmin-password-icon]');
              const toggle = field?.querySelector('[data-svadmin-password-toggle]');
              const label = root?.querySelector('label');
              if (!field || !icon || !toggle || !label) throw new Error('Missing password anatomy');
              const inputBox = control.getBoundingClientRect();
              const iconBox = icon.getBoundingClientRect();
              const toggleBox = toggle.getBoundingClientRect();
              const style = getComputedStyle(control);
              const textLeft = inputBox.left + parseFloat(style.paddingLeft);
              const textRight = inputBox.right - parseFloat(style.paddingRight);
              const rtl = style.direction === 'rtl';
              return {
                documentWidth: document.documentElement.scrollWidth,
                labelBottom: label.getBoundingClientRect().bottom,
                inputTop: inputBox.top,
                inputWidth: inputBox.width,
                fieldWidth: field.getBoundingClientRect().width,
                iconClearance: rtl ? iconBox.left - textRight : textLeft - iconBox.right,
                toggleClearance: rtl ? textLeft - toggleBox.right : toggleBox.left - textRight,
                iconOffset: Math.abs(iconBox.top + iconBox.height / 2 - inputBox.top - inputBox.height / 2),
                toggleOffset: Math.abs(toggleBox.top + toggleBox.height / 2 - inputBox.top - inputBox.height / 2),
              };
            });
            expect(metrics.documentWidth).toBeLessThanOrEqual(width);
            expect(metrics.labelBottom).toBeLessThan(metrics.inputTop);
            expect(metrics.inputWidth).toBeCloseTo(metrics.fieldWidth, 0);
            expect(metrics.iconClearance).toBeGreaterThanOrEqual(4);
            expect(metrics.toggleClearance).toBeGreaterThanOrEqual(4);
            expect(metrics.iconOffset).toBeLessThan(1);
            expect(metrics.toggleOffset).toBeLessThan(1);
            if (state === 'visible') {
              await expect(input).toHaveValue('Layout-check-123!');
              await page.getByRole('button', { name: 'Hide password' }).click();
            }
          }
          await page.screenshot({
            path: testInfo.outputPath(`password-${width}x${height}-${dir}.png`),
            animations: 'disabled',
          });
        }
      }
      await input.focus();
      // macOS WebKit uses Option-Tab for all controls unless full keyboard navigation is enabled.
      await page.keyboard.press(process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
      const toggle = page.getByRole('button', { name: 'Show password' });
      await expect(toggle).toBeFocused();
      await page.keyboard.press('Space');
      await expect(input).toHaveAttribute('type', 'text');
      await page.keyboard.press('Enter');
      await expect(input).toHaveAttribute('type', 'password');
      await expect(page.getByTestId('submit-count')).toHaveText('0');
    });
  }
}
