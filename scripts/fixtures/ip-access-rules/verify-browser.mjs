import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export async function verifyBrowser(page, output) {
  const runtimeErrors = [];
  const checks = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const [width, height] of [[1440, 900], [1920, 1080], [375, 812], [812, 375]]) {
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height });
      await page.goto('http://127.0.0.1:4198/');
      await page.getByRole('heading', { name: 'Network access', exact: true }).waitFor();
      if (dark) await page.getByRole('checkbox', { name: 'Dark mode' }).check();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      if (width === 1440 && !dark) {
        await page.screenshot({ path: join(output, '1440x900.png'), animations: 'disabled' });
      }

      const opener = page.getByRole('button', { name: 'Open whitelist drawer', exact: true });
      await opener.click();
      const drawer = page.getByRole('dialog', { name: 'Network Security & IP Access Rules', exact: true });
      await drawer.waitFor();
      await page.waitForFunction(() => document.querySelector('[data-svadmin-component="IpWhitelistDrawer"]')?.contains(document.activeElement));
      await drawer.getByLabel('Enforcement Mode').selectOption('WHITELIST');
      await drawer.getByText('Whitelist Mode', { exact: true }).waitFor();
      await drawer.getByRole('button', { name: 'Delete 203.0.113.195', exact: true }).click();
      assert.match(await drawer.getByRole('alert').innerText(), /would block/);
      assert.equal(await drawer.getByRole('switch', { name: 'Toggle 203.0.113.195', exact: true }).getAttribute('aria-checked'), 'true');
      await drawer.getByLabel('Enforcement Mode').selectOption('BLACKLIST');
      if (width === 1920 && !dark) {
        await page.screenshot({ path: join(output, '1920x1080.png'), animations: 'disabled' });
      }

      const add = drawer.getByRole('button', { name: 'Add IP Rule', exact: true });
      await add.click();
      const modal = page.getByRole('dialog', { name: 'Add IP Access Rule', exact: true });
      await modal.waitFor();
      await page.waitForFunction(() => document.activeElement?.getAttribute('id')?.endsWith('-type'));
      await page.mouse.click(1, 1);
      assert.equal(await modal.isVisible(), true);
      for (let index = 0; index < 12; index++) {
        await page.keyboard.press(index % 2 ? 'Shift+Tab' : 'Tab');
        assert.equal(await modal.evaluate(element => element.contains(document.activeElement)), true);
      }
      const duplicateIds = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      });
      assert.deepEqual(duplicateIds, []);
      await modal.getByLabel('IP / Pattern Value').fill('not:an:ip');
      await modal.getByRole('button', { name: 'Save Rule', exact: true }).click();
      assert.equal(await modal.getByLabel('IP / Pattern Value').getAttribute('aria-invalid'), 'true');
      await modal.getByRole('alert').waitFor();
      await page.screenshot({ path: join(output, `${width}x${height}-${dark ? 'dark' : 'light'}-validation.png`), animations: 'disabled' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const box = await modal.boundingBox();
      assert.ok(box && box.x >= 0 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1);
      assert.equal(Math.round(box.width), Math.min(520, width - 32));

      await page.keyboard.press('Escape');
      await modal.waitFor({ state: 'detached' });
      assert.equal(await drawer.isVisible(), true);
      assert.equal(await add.evaluate(element => element === document.activeElement), true);

      const expirationBefore = await drawer.locator('time').getAttribute('datetime');
      await drawer.getByRole('button', { name: 'Edit 192.0.2.0/24', exact: true }).click();
      const editModal = page.getByRole('dialog', { name: 'Edit IP Access Rule', exact: true });
      await editModal.getByLabel('Description', { exact: true }).fill('');
      await editModal.getByRole('button', { name: 'Save Rule', exact: true }).click();
      await editModal.waitFor({ state: 'detached' });
      const savedRules = JSON.parse(await page.getByTestId('receipt').textContent());
      assert.equal(savedRules.find(rule => rule.id === 'maintenance').expiresAt, expirationBefore);
      assert.equal(savedRules.find(rule => rule.id === 'maintenance').description, '');

      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'detached' });
      assert.equal(await opener.evaluate(element => element === document.activeElement), true);
      checks.push({ width, height, dark, nestedKeyboard: 'PASS', lockout: 'PASS', expirationPreserved: 'PASS', noPageOverflow: 'PASS' });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:4198/');
  await page.getByRole('button', { name: 'Edit 192.0.2.0/24', exact: true }).click();
  await page.evaluate(() => {
    const next = window.__ipFixture.snapshot();
    next.find(rule => rule.id === 'maintenance').action = 'DENY';
    window.__ipFixture.replaceRules(next);
  });
  await page.getByRole('button', { name: 'Save Rule', exact: true }).click();
  assert.match(await page.getByRole('alert').innerText(), /Policy changed while editing/);
  assert.equal(await page.getByTestId('receipt').textContent(), '');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate(() => {
    window.__ipFixture.replaceRules([]);
    window.__ipFixture.deferSave();
  });
  await page.getByRole('button', { name: 'Trust My IP', exact: true }).click();
  await page.evaluate(() => {
    window.__ipFixture.replaceRules([{ id: 'revoked', type: 'SINGLE', value: '203.0.113.195', action: 'DENY', enabled: true }]);
    window.__ipFixture.finishSave();
  });
  await page.getByRole('alert').filter({ hasText: 'Policy changed while saving' }).waitFor();
  assert.equal(await page.getByRole('cell', { name: 'DENY', exact: true }).count(), 1);
  assert.equal(await page.getByRole('cell', { name: 'ALLOW', exact: true }).count(), 0);

  await page.goto('http://127.0.0.1:4198/');
  await page.getByRole('button', { name: 'Open whitelist drawer', exact: true }).click();
  const busyDrawer = page.getByRole('dialog', { name: 'Network Security & IP Access Rules', exact: true });
  await busyDrawer.getByRole('button', { name: 'Edit 192.0.2.0/24', exact: true }).click();
  const busyModal = page.getByRole('dialog', { name: 'Edit IP Access Rule', exact: true });
  await page.evaluate(() => window.__ipFixture.deferSave());
  await busyModal.getByRole('button', { name: 'Save Rule', exact: true }).click();
  assert.equal(await busyModal.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(), true);
  assert.equal(await busyDrawer.getByLabel('Enforcement Mode').isDisabled(), true);
  await page.keyboard.press('Escape');
  await page.mouse.click(1, 1);
  assert.equal(await busyModal.isVisible(), true);
  await page.evaluate(() => window.__ipFixture.finishSave());
  await busyModal.waitFor({ state: 'detached' });

  await page.evaluate(() => window.__ipFixture.deferSave());
  await busyDrawer.getByLabel('Enforcement Mode').selectOption('WHITELIST');
  await page.evaluate(() => {
    window.__ipFixture.replaceRules([]);
    window.__ipFixture.finishSave();
  });
  await busyDrawer.getByRole('alert').filter({ hasText: 'Policy changed while switching mode' }).waitFor();
  assert.equal(await busyDrawer.getByLabel('Enforcement Mode').inputValue(), 'BLACKLIST');
  assert.deepEqual(runtimeErrors, []);
  writeFileSync(join(output, 'browser-results.json'), `${JSON.stringify({
    status: 'PASS', environment: 'Local Chrome, documentation-range fixture IPs, in-memory callbacks',
    browser: page.context().browser()?.version(),
    checks, staleEdit: 'PASS', staleSave: 'PASS', staleMode: 'PASS', pendingCloseProtection: 'PASS', runtimeErrors,
  }, null, 2)}\n`);
  console.info(JSON.stringify({ status: 'PASS', viewportThemeCases: checks.length, runtimeErrors }));
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  await verifyBrowser(await browser.newPage(), fileURLToPath(new URL('../../../docs/pr-evidence/pr-ip-access-rules', import.meta.url)));
} finally {
  await browser.close();
}
