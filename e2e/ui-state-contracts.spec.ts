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
      const commandFixture = page.locator('[data-command-action-fixture]');
      await expect(commandFixture).toBeVisible();
      const commandButtons = commandFixture.getByRole('button', { name: /Submit order|提交订单/ });
      await expect(commandButtons).toHaveCount(2);
      await expect(commandButtons.nth(0)).toBeEnabled();
      await expect(commandButtons.nth(1)).toBeDisabled();
      const blockedCommand = commandFixture.locator('[data-slot="button-restriction"]');
      await expect(blockedCommand).toHaveCount(1);
      await blockedCommand.hover();
      await expect(page.getByRole('tooltip')).toContainText(/frozen|冻结/);

      await mkdir(screenshotDirectory, { recursive: true });
      await filterToggle.click();
      await page.screenshot({ path: join(screenshotDirectory, `ui-state-matrix-${viewport.width}x${viewport.height}.png`), fullPage: false });
      await commandFixture.scrollIntoViewIfNeeded();
      await blockedCommand.hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await page.screenshot({ path: join(screenshotDirectory, `command-action-${viewport.width}x${viewport.height}.png`), fullPage: false });

      await page.goto('/#/case_workspace');
      const workspace = page.locator('[data-app-page="case-workspace"]');
      await page.getByRole('button', { name: /Accept case|确认受理/, exact: true }).click();
      await expect(workspace).toHaveAttribute('data-active-stage', 'execution');
      await workspace.getByRole('textbox').fill('Recorded test method, equipment and observations');
      await page.getByRole('button', { name: /Submit execution record|提交试验记录/, exact: true }).click();
      await expect(workspace).toHaveAttribute('data-active-stage', 'evidence');

      const evidence = workspace.getByText(/Evidence is required before proceeding to the report\.|缺少证据时不能进入报告。/, { exact: true });
      await expect(evidence).toBeVisible();
      await page.getByRole('button', { name: /Confirm local evidence|确认本地证据/, exact: true }).click();
      await expect(workspace).toHaveAttribute('data-active-stage', 'evidence');
      await expect(workspace.getByRole('status')).toBeVisible();
      const layout = await page.locator('main').evaluate((main) => {
        const content = main.querySelector<HTMLElement>('[data-svadmin-content-page]') ?? main;
        return {
          horizontalOverflow: content.scrollWidth > content.clientWidth + 1,
          documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });

      expect(layout.horizontalOverflow).toBe(false);
      expect(layout.documentOverflow).toBe(false);
      expect(await evidence.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(48);

      await page.screenshot({ path: join(screenshotDirectory, `case-empty-media-${viewport.width}x${viewport.height}.png`), fullPage: false });
    });

    test(`api keys layout remains bounded at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await login(page);
      await page.goto('/#/account/api-keys');

      // The page runs without a CredentialProvider in the example app: the
      // webhook form is disabled but must still render untruncated.
      const urlInput = page.getByRole('textbox', { name: 'Webhook URL', exact: true });
      await expect(urlInput).toBeVisible();
      await expect(page.getByRole('heading', { name: /API Settings|API 设置/ })).toBeVisible();
      // Let the lazy page chunk settle so the evidence screenshot is complete.
      await page.waitForTimeout(500);

      const languageSelect = page.locator('[data-svadmin-sidebar] select').first();
      await expect(languageSelect).toBeVisible();

      const metrics = await page.evaluate((inputId) => {
        const measure = (text: string, style: CSSStyleDeclaration) => {
          const context = document.createElement('canvas').getContext('2d');
          if (!context) return 0;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return context.measureText(text).width;
        };

        const input = document.getElementById(inputId) as HTMLInputElement | null;
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
      }, await urlInput.getAttribute('id') ?? '');

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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`settings hierarchy and theme controls at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('/#/account/appearance');
    const main = page.locator('[data-svadmin-main]');
    await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(main.getByRole('combobox', { name: /^(Language|语言)$/ })).toBeVisible();

    const density = main.getByRole('group', { name: /Sidebar density|侧边栏密度/i });
    await density.getByRole('button', { name: /^(Compact|紧凑)$/ }).click();
    await expect(density.getByRole('button', { pressed: true })).toHaveText(/Compact|紧凑/);
    const pageSize = main.getByRole('group', { name: /Default page size|默认每页条数/i });
    await pageSize.getByRole('button', { name: '50', exact: true }).click();
    await expect(pageSize.getByRole('button', { pressed: true })).toHaveText('50');
    await page.reload();
    await expect(density.getByRole('button', { pressed: true })).toHaveText(/Compact|紧凑/);
    await expect(pageSize.getByRole('button', { pressed: true })).toHaveText('50');

    for (const mode of ['light', 'dark'] as const) {
      await main.getByRole('button', { name: mode === 'light' ? /^(Light|浅色)$/ : /^(Dark|深色)$/ }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
      for (const preset of ['Neutral', 'Indigo', 'Blue', 'Green', 'Rose', 'Orange', 'Violet', 'Stripe']) {
        const swatch = main.getByRole('button', { name: preset, exact: true });
        await swatch.click();
        await expect(swatch).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', preset.toLowerCase());
        await expect(main.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '20px');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath(`settings-${mode}-${viewport.width}.png`), animations: 'disabled' });
    }

    for (const route of [
      '/account/home/user-profile', '/settings/account', '/account/notifications',
      '/account/integrations', '/account/home/settings-plain', '/account/home/settings-sidebar',
    ]) {
      await page.goto(`/#${route}`);
      await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.goto('/#/account/notifications');
    const switches = main.getByRole('switch');
    await expect(switches).toHaveCount(7);
    for (const control of await switches.all()) {
      await expect(control).toHaveAccessibleName(/\S/);
    }

    for (const mode of ['light', 'dark'] as const) {
      await page.goto('/#/account/appearance');
      await main.getByRole('button', { name: mode === 'light' ? /^(Light|浅色)$/ : /^(Dark|深色)$/ }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
      for (const [name, route, expectedLabels] of [
      ['enterprise', '/account/home/settings-enterprise', 5],
      ['api', '/account/api-keys', 8],
    ] as const) {
      await page.goto(`/#${route}`);
      await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
      const labels = main.locator('label[for]');
      await expect(labels).toHaveCount(expectedLabels);
      const warning = main.locator('[data-svadmin-feedback-notice][data-tone="warning"]').first();
      await expect(warning).toBeVisible();
      expect(await warning.evaluate((element) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--foreground)';
        element.append(probe);
        const matches = getComputedStyle(element).color === getComputedStyle(probe).color;
        probe.remove();
        return matches;
      })).toBe(true);
      const contrast = await warning.evaluate((element) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas is required for color contrast verification');
        const ancestors: Element[] = [];
        for (let node: Element | null = element; node; node = node.parentElement) ancestors.unshift(node);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, 1, 1);
        for (const ancestor of ancestors) {
          context.fillStyle = getComputedStyle(ancestor).backgroundColor;
          context.fillRect(0, 0, 1, 1);
        }
        const luminance = (pixel: Uint8ClampedArray) => {
          const channel = (index: number) => {
            const value = (pixel[index] ?? 0) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
        };
        const background = luminance(context.getImageData(0, 0, 1, 1).data);
        context.fillStyle = getComputedStyle(element).color;
        context.fillRect(0, 0, 1, 1);
        const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
        return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      for (const label of await labels.all()) {
        expect(await label.evaluate((element: HTMLLabelElement) => {
          const control = element.control;
          return control !== null
            && document.querySelectorAll(`[id="${CSS.escape(element.htmlFor)}"]`).length === 1;
        })).toBe(true);
      }
      const controls = main.locator('input:not([type="hidden"]), select, button[role="switch"], button[role="checkbox"]');
      for (const control of await controls.all()) {
        await expect(control).toHaveAccessibleName(/\S/);
        await expect(control).toBeDisabled();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await main.evaluate(element => {
        for (let node: HTMLElement | null = element; node; node = node.parentElement) node.scrollTo({ top: 0, behavior: 'instant' });
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await main.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
      await expect(main.getByRole('heading', { level: 1 })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`settings-${name}-${mode}-${viewport.width}.png`), animations: 'disabled' });
      }
    }
  });
}
