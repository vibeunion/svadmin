import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from '@playwright/test';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const root = resolve(import.meta.dirname, '../packages/ui/test/dropdown-containment');
const output = resolve(import.meta.dirname, '../output/playwright/dropdown-containment');
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false, root, plugins: [svelte()],
  server: { host: '127.0.0.1', port: 0 },
});

try {
  await server.listen();
  const address = server.httpServer?.address();
  assert(address && typeof address !== 'string');
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [width, height] of [[1440, 900], [1920, 1080]]) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${address.port}`);
        const tableTrigger = page.getByRole('button', { name: 'Table actions' });
        await tableTrigger.click();
        const tableMenu = page.getByRole('menu', { name: 'Table actions' });
        await tableMenu.waitFor({ state: 'visible' });
        await page.waitForFunction(() => {
          const menu = document.querySelector('[role="menu"]');
          if (!menu) return false;
          const rect = menu.getBoundingClientRect();
          return rect.left >= 7 && rect.right <= innerWidth - 7 && rect.bottom <= innerHeight - 7;
        });
        assert(await tableMenu.evaluate((element) => element.matches(':popover-open')));
        const bounds = await tableMenu.boundingBox();
        const triggerBounds = await tableTrigger.boundingBox();
        assert(bounds && triggerBounds && bounds.y + bounds.height <= triggerBounds.y);
        const inspect = tableMenu.getByRole('menuitem', { name: 'Inspect' });
        assert(await inspect.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }));
        await page.screenshot({ path: `${output}/${name}-${width}-table.png`, animations: 'disabled' });
        await inspect.click();
        assert.equal(await page.getByTestId('selected').textContent(), 'inspect');
        assert.equal(await tableMenu.count(), 0);

        await page.getByRole('button', { name: 'Open drawer' }).click();
        const dialog = page.getByRole('dialog', { name: 'Containment drawer' });
        const drawerTrigger = dialog.getByRole('button', { name: 'Drawer actions' });
        await drawerTrigger.focus();
        await drawerTrigger.press('ArrowDown');
        const drawerMenu = dialog.getByRole('menu', { name: 'Drawer actions' });
        await drawerMenu.waitFor({ state: 'visible' });
        assert(await drawerMenu.evaluate((element) => element.matches(':popover-open')));
        await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Inspect');
        const beforeScroll = await drawerMenu.boundingBox();
        assert(beforeScroll);
        await page.getByTestId('drawer-scroll').evaluate((element) => { element.scrollTop = 12; });
        await page.waitForFunction((previousY) => {
          const menu = document.querySelector('[aria-label="Drawer actions"][role="menu"]');
          return menu && Math.abs(menu.getBoundingClientRect().y - (previousY - 12)) < 2;
        }, beforeScroll.y);
        await page.getByTestId('drawer-scroll').evaluate((element) => { element.scrollTop = 0; });
        await page.waitForFunction((previousY) => {
          const menu = document.querySelector('[aria-label="Drawer actions"][role="menu"]');
          return menu && Math.abs(menu.getBoundingClientRect().y - previousY) < 2;
        }, beforeScroll.y);
        await page.screenshot({ path: `${output}/${name}-${width}-drawer.png`, animations: 'disabled' });
        await page.keyboard.press('End');
        assert.equal((await page.locator(':focus').textContent())?.trim(), 'Archive');
        await page.keyboard.press('Escape');
        assert.equal(await drawerMenu.count(), 0);
        assert(await dialog.isVisible());
        assert(await drawerTrigger.evaluate((element) => element === document.activeElement));
        await drawerTrigger.click();
        await drawerMenu.getByRole('menuitem', { name: 'Archive' }).click();
        assert.equal(await page.getByTestId('selected').textContent(), 'archive');
        assert(await dialog.isVisible());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        await page.close();
        console.info(`${name} ${width}x${height}: clipping, flip, hit-test, scroll tracking, drawer focus and actions passed`);
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
