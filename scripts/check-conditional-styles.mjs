import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const css = readFileSync('packages/ui/dist/app.css', 'utf8');
const checks = [];
const browser = await chromium.launch();
try {
  for (const width of [390, 767, 768, 1440, 1920]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.setContent(`<!doctype html><html class="${dark ? 'dark' : ''}"><body>
          <div id="sidebar" class="w-[252px]"></div>
          <div id="content" class="sidebar-content-expanded md:ml-[252px]"></div>
          <div id="step" class="bg-primary text-primary-foreground"></div>
          <div id="social" style="display:grid;width:200px" class="grid-cols-2"><span>A</span><span>B</span></div>
          <div id="tools" style="display:inline-block" class="w-auto min-w-[200px]">Tools</div>
          <div id="spacing" style="display:flex" class="px-5 justify-center"></div>
        </body></html>`);
        await page.addStyleTag({ content: css });
        const value = (id, property) => page.locator(`#${id}`).evaluate((element, property) => getComputedStyle(element)[property], property);
        async function assertStepColor(background, foreground) {
          const colors = await page.locator('#step').evaluate((element, tokens) => {
            const probe = document.createElement('span');
            probe.style.backgroundColor = `var(--${tokens[0]})`;
            probe.style.color = `var(--${tokens[1]})`;
            element.append(probe);
            const expected = [getComputedStyle(probe).backgroundColor, getComputedStyle(probe).color];
            const actual = [getComputedStyle(element).backgroundColor, getComputedStyle(element).color];
            probe.remove();
            return { expected, actual };
          }, [background, foreground]);
          assert.deepEqual(colors.actual, colors.expected);
        }
        assert.equal(await value('sidebar', 'width'), '252px');
        assert.equal(await value('content', 'marginLeft'), width >= 768 ? '252px' : '0px');
        await page.locator('#sidebar').evaluate((element) => { element.className = 'w-[70px]'; });
        await page.locator('#content').evaluate((element) => { element.className = 'sidebar-content-collapsed md:ml-[70px]'; });
        assert.equal(await value('sidebar', 'width'), '70px');
        assert.equal(await value('content', 'marginLeft'), width >= 768 ? '70px' : '0px');
        assert.equal(await value('social', 'gridTemplateColumns'), '100px 100px');
        assert.equal(await value('tools', 'minWidth'), '200px');
        assert.equal(await value('spacing', 'paddingLeft'), '20px');
        assert.equal(await value('spacing', 'justifyContent'), 'center');
        for (const [name, padding] of [['px-2', '8px'], ['px-[10px]', '10px']]) {
          await page.locator('#spacing').evaluate((element, name) => { element.className = name; }, name);
          assert.equal(await value('spacing', 'paddingLeft'), padding);
        }
        await assertStepColor('primary', 'primary-foreground');
        await page.locator('#step').evaluate((element) => { element.className = 'bg-muted text-muted-foreground'; });
        await assertStepColor('muted', 'muted-foreground');
        if (width >= 768) {
          await page.locator('html').evaluate((element) => { element.dir = 'rtl'; });
          assert.equal(await value('content', 'marginLeft'), '0px');
          assert.equal(await value('content', 'marginRight'), '70px');
        }
        checks.push({ width, dark, expanded: true, collapsed: true, responsive: true, controls: true });
      } finally { await page.close(); }
    }
  }
  assert.equal(checks.length, 10);
  mkdirSync('docs/pr-evidence/panda-styles', { recursive: true });
  writeFileSync('docs/pr-evidence/panda-styles/conditional-styles.json', `${JSON.stringify({
    testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    cssSha256: createHash('sha256').update(css).digest('hex'),
    scope: 'Computed native CSS for class names statically checked against real Svelte directives; not full component behavior',
    checks,
  }, null, 2)}\n`);
  console.info(`Conditional native styles: ${checks.length} responsive/theme cases passed`);
} finally { await browser.close(); }
