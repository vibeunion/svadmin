import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ui = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(ui, '../..');
const require = createRequire(join(ui, 'package.json'));
const { build, preview } = await import(require.resolve('vite'));
const { svelte } = await import(require.resolve('@sveltejs/vite-plugin-svelte'));
const { chromium, expect } = require('@playwright/test');
const evidence = resolve(process.env.AUTH_SHELL_EVIDENCE ?? join(root, 'output/playwright/auth-page-shell'));

async function geometry(page) {
  return page.locator('[data-svadmin-auth-page]').evaluate(shell => {
    const visible = element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
    const brands = [...shell.querySelectorAll('[data-svadmin-auth-brand]')].filter(visible);
    const brandTextFits = brands.every(brand => {
      const text = brand.lastElementChild;
      if (!text || text.textContent !== 'QualificationWorkspaceInternationalOperations') return false;
      const bounds = text.getBoundingClientRect();
      const container = brand.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(text);
      return text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1
        && bounds.left >= container.left - 1 && bounds.right <= container.right + 1
        && bounds.top >= container.top - 1 && bounds.bottom <= container.bottom + 1
        && [...range.getClientRects()].every(line => line.left >= bounds.left - 1
          && line.right <= bounds.right + 1 && line.top >= bounds.top - 1 && line.bottom <= bounds.bottom + 1);
    });
    const nodes = [...shell.querySelectorAll('aside, main, section, header, h1, h2, p, form, input, button, a, [data-svadmin-auth-brand]')].filter(visible);
    const overflow = nodes.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1;
    }).map(element => element.tagName);
    const card = shell.querySelector('[data-svadmin-auth-card]');
    const heading = card?.querySelector('h1');
    const description = card?.querySelector('header p');
    const main = shell.querySelector('[data-svadmin-auth-main]');
    const aside = shell.querySelector('[data-svadmin-auth-aside]');
    if (!card || !heading || !description || !main || !aside) throw new Error('Missing authentication structure');
    return {
      visibleBrands: brands.length,
      brandTextFits,
      desktopBrand: visible(aside),
      documentOverflow: document.documentElement.scrollWidth > innerWidth,
      overflow,
      labelled: card.getAttribute('aria-labelledby') === heading.id && heading.id !== '',
      described: card.getAttribute('aria-describedby') === description.id && description.id !== '',
      headingSize: getComputedStyle(heading).fontSize,
      mainOverflowX: getComputedStyle(main).overflowX,
    };
  });
}

async function assertFocus(page, control) {
  await expect(control).toBeFocused();
  const focus = await control.evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const ring = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset));
    return {
      visible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      withinViewport: rect.left - ring >= 0 && rect.right + ring <= innerWidth
        && rect.top - ring >= 0 && rect.bottom + ring <= innerHeight,
    };
  });
  assert.equal(focus.visible, true);
  assert.notEqual(focus.outlineStyle, 'none');
  assert.ok(focus.outlineWidth > 0);
  assert.equal(focus.withinViewport, true, JSON.stringify(focus));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

async function assertTheme(page, theme) {
  const paint = await page.locator('[data-svadmin-auth-page]').evaluate(shell => {
    const card = shell.querySelector('[data-svadmin-auth-card]');
    const brand = [...shell.querySelectorAll('[data-svadmin-auth-brand]')].find(element => element.getBoundingClientRect().width > 0);
    const text = brand?.lastElementChild;
    if (!card || !text) throw new Error('Missing theme targets');
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Missing color sampler');
    const brightness = color => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return (red + green + blue) / 3;
    };
    const background = getComputedStyle(card).backgroundColor;
    const foreground = getComputedStyle(text).color;
    return { background, foreground, backgroundBrightness: brightness(background), textBrightness: brightness(foreground) };
  });
  assert.equal(paint.backgroundBrightness < 128, theme === 'dark', JSON.stringify(paint));
  assert.equal(paint.textBrightness > 128, theme === 'dark', JSON.stringify(paint));
  return paint;
}

test('auth brands, labels, focus and recovery fit desktop and narrow viewports', { timeout: 120_000 }, async () => {
  mkdirSync(evidence, { recursive: true });
  const work = mkdtempSync(join(evidence, 'fixture-'));
  const report = {
    sources: Object.fromEntries([
      'src/app.css', 'src/styles/compatibility.prelude.css', 'src/styles/tailwind.generated.css',
      'src/components/AuthPageShell.svelte', 'src/components/LoginPage.svelte',
      'src/components/PasswordInput.svelte', 'test/fixtures/AuthPageShellBrowser.svelte',
      'scripts/auth-page-shell.browser.test.mjs',
    ].map(path => [path, createHash('sha256').update(readFileSync(join(ui, path))).digest('hex')])),
    cases: [],
  };
  let server;
  let browser;
  try {
    writeFileSync(join(work, 'index.html'), '<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authentication verification</title><div id="app"></div><script type="module" src="/main.js"></script></html>');
    writeFileSync(join(work, 'main.js'), `import { mount } from 'svelte';\nimport ${JSON.stringify(join(ui, 'src/app.css'))};\nimport Fixture from ${JSON.stringify(join(ui, 'test/fixtures/AuthPageShellBrowser.svelte'))};\nmount(Fixture, { target: document.getElementById('app') });\n`);
    await build({
      configFile: false, root: work, plugins: [svelte({ configFile: false })],
      resolve: { conditions: ['browser'] }, build: { outDir: 'build', emptyOutDir: true }, logLevel: 'warn',
    });
    server = await preview({
      configFile: false, root: work, build: { outDir: 'build' },
      preview: { host: '127.0.0.1', port: 0 }, logLevel: 'warn',
    });
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    for (const viewport of [
      { width: 1440, height: 900 }, { width: 1920, height: 1080 },
      { width: 390, height: 844 }, { width: 320, height: 640 },
    ]) {
      for (const theme of ['light', 'dark']) {
        for (const mode of ['default', 'custom', 'login']) {
          const page = await browser.newPage({ viewport, locale: 'en-US', colorScheme: theme });
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto(`http://127.0.0.1:${address.port}/?mode=${mode}&long=1`);
          await page.evaluate(theme => {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            const host = document.querySelector('.svadmin-theme');
            if (!host) throw new Error('Missing theme host');
            host.classList.toggle('dark', theme === 'dark');
            host.classList.toggle('svadmin-theme-dark', theme === 'dark');
          }, theme);
          const card = page.locator('[data-svadmin-auth-card]');
          await expect(card).toBeVisible();
          const layout = await geometry(page);
          const paint = await assertTheme(page, theme);
          assert.deepEqual(layout, {
            visibleBrands: 1, brandTextFits: true, desktopBrand: viewport.width >= 1024,
            documentOverflow: false, overflow: [], labelled: true, described: true,
            headingSize: '20px', mainOverflowX: 'visible',
          }, `${mode} ${theme} ${viewport.width}: ${JSON.stringify(layout)}`);
          if (mode !== 'login') {
            await expect(page.locator('[data-testid="custom-mark"]')).toHaveCount(mode === 'custom' ? 2 : 0);
            await expect(page.locator('[data-svadmin-auth-default-mark]')).toHaveCount(mode === 'default' ? 2 : 0);
            const email = page.getByRole('textbox', { name: 'Email', exact: true });
            const password = page.getByLabel('Password', { exact: true });
            const submit = page.getByRole('button', { name: 'Continue' });
            const help = page.getByRole('link', { name: 'Account support' });
            for (const control of [email, password, submit, help]) {
              await page.keyboard.press('Tab');
              await assertFocus(page, control);
            }
            for (const control of [submit, password, email]) {
              await page.keyboard.press('Shift+Tab');
              await assertFocus(page, control);
            }
          } else {
            const identifier = page.getByRole('textbox', { name: 'Work account', exact: true });
            const password = page.getByLabel('Password', { exact: true });
            const submit = page.getByRole('button', { name: 'Sign in', exact: true });
            await page.keyboard.press('Tab');
            await assertFocus(page, identifier);
            await identifier.press('Enter');
            const error = page.locator('[data-svadmin-login-error]');
            await expect(error).toBeVisible();
            await expect(error).toHaveText(/Username or Email is required/);
            await assertFocus(page, identifier);
            await expect(error).toHaveAttribute('aria-live', 'assertive');
            for (const control of [identifier, password]) {
              await expect(control).toHaveAttribute('aria-invalid', 'true');
              await expect(control).toHaveAttribute('aria-describedby', await error.getAttribute('id'));
            }
            await expect(page.getByTestId('login-attempts')).toHaveText('0');
            const invalidLayout = await geometry(page);
            assert.deepEqual(invalidLayout.overflow, []);
            assert.equal(invalidLayout.documentOverflow, false);
            if (theme === 'light') {
              await page.screenshot({ path: join(evidence, `login-error-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
            }
            await identifier.fill('operator@example.invalid');
            await identifier.press('Tab');
            await assertFocus(page, password);
            await password.fill('synthetic-fixture-value');
            await password.press('Enter');
            await expect(error).toHaveText(/Authentication request was rejected\./);
            await assertFocus(page, password);
            await expect(page.getByTestId('login-attempts')).toHaveText('1');
            await expect(submit).toBeEnabled();
            await password.press('Enter');
            await expect(page.getByTestId('login-attempts')).toHaveText('2');
            await expect(error).toHaveCount(0);
            await expect(identifier).not.toHaveAttribute('aria-invalid');
            await expect(password).not.toHaveAttribute('aria-describedby');
            await expect(submit).toBeEnabled();
          }
          assert.deepEqual(errors, []);
          if (mode === 'custom' && (theme === 'light' || viewport.width === 390)) {
            await page.screenshot({ path: join(evidence, `custom-${theme}-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
          }
          report.cases.push({ viewport, theme, mode, layout, paint, keyboard: true, pageErrors: errors, passed: true });
          await page.close();
        }
      }
    }
    writeFileSync(join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  } finally {
    await browser?.close();
    if (server) await new Promise((resolveClose, reject) => server.httpServer.close(error => error ? reject(error) : resolveClose()));
    rmSync(work, { recursive: true, force: true });
  }
});
