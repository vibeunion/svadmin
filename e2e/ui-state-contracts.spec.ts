import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 });
}

test.describe('UI state contracts', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    test(`UI states remain bounded at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await login(page);
      await page.goto('/#/design_principles');

      const fixture = page.locator('[data-ui-state-fixture]');
      await expect(fixture).toBeVisible();

      const loaded = fixture.locator('[data-media-state="loaded"]');
      await expect(loaded).toBeVisible();
      await expect(loaded.locator('img')).toHaveJSProperty('complete', true);
      const previewButton = loaded.getByRole('button', { name: 'Preview Loaded evidence' });
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(previewButton).toBeFocused();

      const failed = fixture.locator('[data-media-state="error"]');
      await expect(failed).toBeVisible();
      await expect(failed).toContainText(/Image unavailable|图片不可用/);
      await expect(fixture.locator('[data-media-state="empty"]')).toContainText(/No media|暂无媒体/);

      const filterToolbar = page.locator('[data-svadmin-filter-toolbar]').first();
      const filterToggle = filterToolbar.getByRole('button', { name: /Advanced filters|高级筛选/ });
      await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(filterToolbar.locator('.svadmin-filter-toolbar-advanced')).toHaveCount(0);
      await filterToggle.click();
      await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(filterToolbar.locator('.svadmin-filter-toolbar-advanced')).toBeVisible();
      await filterToggle.click();
      await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(filterToolbar.locator('.svadmin-filter-toolbar-advanced')).toHaveCount(0);

      const screenshotDirectory = process.env.UI_SCREENSHOT_DIR ?? testInfo.outputPath('screenshots');
      await mkdir(screenshotDirectory, { recursive: true });
      await filterToggle.click();
      await page.screenshot({ path: join(screenshotDirectory, `ui-state-matrix-${viewport.width}x${viewport.height}.png`), fullPage: false });

      await page.goto('/#/case_workspace');
      await page.getByRole('button', { name: /证据治理: Blocked|Evidence: Blocked/ }).click();

      const evidence = page.locator('[data-media-state="empty"]');
      await expect(evidence).toBeVisible();
      const layout = await page.locator('main').evaluate((main) => {
        const empty = main.querySelector<HTMLElement>('[data-media-state="empty"]');
        const content = main.querySelector<HTMLElement>('[data-svadmin-content-page]') ?? main;
        return {
          horizontalOverflow: content.scrollWidth > content.clientWidth + 1,
          emptyHeight: empty?.getBoundingClientRect().height ?? 0,
          documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });

      expect(layout.horizontalOverflow).toBe(false);
      expect(layout.documentOverflow).toBe(false);
      expect(layout.emptyHeight).toBeLessThan(48);

      await page.screenshot({ path: join(screenshotDirectory, `case-empty-media-${viewport.width}x${viewport.height}.png`), fullPage: false });
    });

    test(`api keys layout remains bounded at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await login(page);
      await page.goto('/#/account/api-keys');

      // The page runs without a CredentialProvider in the example app: the
      // webhook form is disabled but must still render untruncated.
      const urlInput = page.locator('#webhook-url');
      await expect(urlInput).toBeVisible();
      await expect(page.getByRole('heading', { name: /API Settings|API 设置/ })).toBeVisible();
      // Let the lazy page chunk settle so the evidence screenshot is complete.
      await page.waitForTimeout(500);

      const languageSelect = page.locator('[data-svadmin-sidebar] select').first();
      await expect(languageSelect).toBeVisible();

      const metrics = await page.evaluate(() => {
        const measure = (text: string, style: CSSStyleDeclaration) => {
          const context = document.createElement('canvas').getContext('2d');
          if (!context) return 0;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return context.measureText(text).width;
        };

        const input = document.querySelector<HTMLInputElement>('#webhook-url');
        const inputStyle = input ? getComputedStyle(input) : null;
        const placeholder = input && inputStyle
          ? {
              text: measure(input.placeholder, inputStyle),
              available: input.clientWidth - parseFloat(inputStyle.paddingLeft) - parseFloat(inputStyle.paddingRight),
            }
          : null;

        const select = document.querySelector<HTMLSelectElement>('[data-svadmin-sidebar] select');
        const selectStyle = select ? getComputedStyle(select) : null;
        const selectedText = select?.selectedOptions[0]?.textContent ?? '';
        const locale = select && selectStyle
          ? {
              text: measure(selectedText, selectStyle),
              available: select.clientWidth - parseFloat(selectStyle.paddingLeft) - parseFloat(selectStyle.paddingRight),
            }
          : null;

        const content = document.querySelector<HTMLElement>('[data-svadmin-content-page]');
        return {
          placeholder,
          locale,
          contentOverflow: content ? content.scrollWidth > content.clientWidth + 1 : false,
          documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });

      expect(metrics.contentOverflow).toBe(false);
      expect(metrics.documentOverflow).toBe(false);
      // URL placeholder (https://api.example.com/hooks) fits the input width.
      expect(metrics.placeholder).not.toBeNull();
      if (metrics.placeholder) {
        expect(metrics.placeholder.text).toBeLessThanOrEqual(metrics.placeholder.available + 1);
      }
      // Sidebar language select shows the full locale name (e.g. "English").
      expect(metrics.locale).not.toBeNull();
      if (metrics.locale) {
        expect(metrics.locale.text).toBeLessThanOrEqual(metrics.locale.available + 1);
      }

      const screenshotDirectory = process.env.UI_SCREENSHOT_DIR ?? testInfo.outputPath('screenshots');
      await mkdir(screenshotDirectory, { recursive: true });
      await page.screenshot({ path: join(screenshotDirectory, `api-keys-${viewport.width}x${viewport.height}.png`), fullPage: false });

      const sidebar = page.locator('[data-svadmin-sidebar]');
      const box = await sidebar.boundingBox();
      if (box) {
        await page.screenshot({
          path: join(screenshotDirectory, `sidebar-footer-${viewport.width}x${viewport.height}.png`),
          clip: { x: box.x, y: box.y + box.height - 140, width: box.width, height: 140 },
        });
      }
    });
  }
});
