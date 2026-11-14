import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const evidenceDir = resolve(process.cwd(), 'docs/evidence/visual-contract');

async function token(page: Page, name: string): Promise<string> {
  return page.evaluate((property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(), name);
}

async function paint(page: Page, selector: string, property: string): Promise<string> {
  return page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
}

async function shoot(page: Page, name: string): Promise<void> {
  if (process.env.UPDATE_VISUAL_CONTRACT !== '1') return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDir, `${name}.png`), fullPage: true, animations: 'disabled' });
}

for (const scheme of ['light', 'dark'] as const) {
  test(`visual contract ${scheme}`, async ({ page }) => {
    await page.goto('/e2e/fixtures/visual-contract.html');
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
    if (scheme === 'dark') {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.dataset.colorScheme = 'dark';
      });
    }

    expect(await token(page, '--svadmin-shell-sidebar-w')).toBe('15rem');
    expect(await token(page, '--svadmin-shell-topbar-h')).toBe('3.5rem');
    expect(await token(page, '--background')).toBe(scheme === 'light' ? '#F7F8FA' : '#17171A');
    expect(await token(page, '--primary')).toBe(scheme === 'light' ? '#165DFF' : '#3C7EFF');
    expect(await token(page, '--warning-foreground')).toBe('#1D2129');
    expect(await token(page, '--svadmin-mask')).toBe('rgb(29 33 41 / 60%)');
    expect(await token(page, '--primary-5')).toBe(scheme === 'light' ? '#4080FF' : '#306FFF');
    expect(await token(page, '--primary-7')).toBe(scheme === 'light' ? '#0E42D2' : '#689FFF');
    expect(await token(page, '--svadmin-text-3')).toBe(scheme === 'light' ? '#86909C' : 'rgb(255 255 255 / 50%)');
    expect(await token(page, '--svadmin-text-4')).toBe(scheme === 'light' ? '#C9CDD4' : 'rgb(255 255 255 / 30%)');

    const body = await page.locator('body').evaluate((element) => {
      const style = getComputedStyle(element);
      return { size: style.fontSize, leading: style.lineHeight, family: style.fontFamily };
    });
    expect(body.size).toBe('14px');
    expect(body.leading).toBe('19.6px');
    expect(body.family.toLowerCase()).toContain('helvetica neue');
    expect(body.family.toLowerCase()).not.toContain('nunito');

    const mask = await paint(page, '#mask', 'background-color');
    expect(mask.replace(/\s+/g, '')).toBe('rgba(29,33,41,0.6)');
    expect(await paint(page, '#mask', 'backdrop-filter')).toMatch(/none/);

    await page.locator('#primary').hover();
    expect((await paint(page, '#primary', 'background-color')).replace(/\s+/g, '')).toBe(
      scheme === 'light' ? 'rgb(64,128,255)' : 'rgb(48,111,255)',
    );
    expect(await paint(page, '#primary-disabled', 'opacity')).toBe('1');
    expect((await paint(page, '#warning', 'color')).replace(/\s+/g, '')).toBe('rgb(29,33,41)');
    expect(await paint(page, '#warning-disabled', 'opacity')).toBe('1');
    expect((await paint(page, '#warning-disabled', 'color')).replace(/\s+/g, '')).toBe('rgb(29,33,41)');

    const gap = await page.locator('#second-paragraph').evaluate((element) => getComputedStyle(element).marginTop);
    expect(gap).toBe('21px');

    await shoot(page, `clean-flat-${scheme}`);
  });
}

test('visual contract desktop viewports do not overflow', async ({ page }) => {
  await page.goto('/e2e/fixtures/visual-contract.html');
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  for (const viewport of [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await shoot(page, `clean-flat-light-${viewport.name}`);
  }
});
