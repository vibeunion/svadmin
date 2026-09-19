import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { buttonVariants } from '../packages/ui/dist/components/ui/button/button-variants.js';
import { badgeVariants } from '../packages/ui/dist/components/ui/badge/badge-variants.js';
import { stableScreenshot } from './stable-screenshot.mjs';

/** 在 Chromium 中显式模拟不支持 color-mix；不改生产文件，不伪称旧浏览器实测。 */
function withoutColorMix(css) {
  const root = postcss.parse(css);
  let removedConditions = 0;
  root.walkAtRules('supports', rule => {
    if (!rule.params.includes('color-mix(')) return;
    assert.match(rule.params, /^\(color:\s*color-mix\(/, 'Unsupported condition must be modeled explicitly');
    removedConditions += 1;
    rule.remove();
  });
  root.walkDecls(decl => {
    if (decl.value.includes('color-mix(')) decl.remove();
  });
  assert.ok(removedConditions > 0, 'Must exercise actual published fallback branches');
  assert.ok(!root.toString().includes('color-mix('));
  return { css: root.toString(), removedConditions };
}

export async function verifyPrimitiveFallbacks(browser, stylesheets, output) {
  const report = {
    testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    scope: 'Published helper classes and CSS; color-mix unsupported branches simulated in Chromium, NOT historical-browser certification or full application accessibility approval',
    minimumTextContrast: 4.5,
    browser: browser.version(),
    checks: [],
    failures: [],
  };
  const variants = ['destructive', 'subtle', 'subtle-success', 'subtle-warning', 'subtle-destructive'];
  const samples = [
    { kind: 'button', variant: 'destructive', className: buttonVariants({ variant: 'destructive' }) },
    ...variants.map(variant => ({ kind: 'badge', variant, className: badgeVariants({ variant }) })),
  ];
  for (const [entry, original] of Object.entries(stylesheets)) {
    const fallback = withoutColorMix(original);
    for (const width of [1440, 1920, 390]) {
      for (const dark of [false, true]) {
        const name = `fallback-${entry.replace('.css', '')}-${width}-${dark ? 'dark' : 'light'}`;
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        try {
          await page.setContent('<!doctype html><html><head><title>UI fallback verification</title></head><body><main><h1>State controls without color-mix</h1><p>Actual published helpers and CSS · simulated unsupported feature</p><section aria-label="State variants"></section></main></body></html>');
          await page.addStyleTag({ content: fallback.css });
          await page.addStyleTag({ content: 'body { margin:0; background:var(--background); color:var(--foreground); font-family:system-ui,sans-serif } main { padding:24px } h1 { font-size:20px; font-weight:600 } p { margin:12px 0 24px } section { display:flex; flex-wrap:wrap; gap:16px; align-items:center }' });
          await page.evaluate(({ dark, samples }) => {
            document.body.className = dark ? 'svadmin-theme dark' : 'svadmin-theme';
            for (const sample of samples) {
              const element = document.createElement(sample.kind === 'button' ? 'button' : 'span');
              element.className = sample.className;
              element.dataset['fallbackSample'] = `${sample.kind}-${sample.variant}`;
              element.textContent = `${sample.kind}: ${sample.variant}`;
              document.querySelector('section').append(element);
            }
          }, { dark, samples });
          async function inspect() {
            return page.locator('[data-fallback-sample]').evaluateAll(elements => {
              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 1;
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (!context) throw new Error('Canvas color conversion unavailable');
              function color(value) {
                context.clearRect(0, 0, 1, 1);
                context.fillStyle = value;
                context.fillRect(0, 0, 1, 1);
                return [...context.getImageData(0, 0, 1, 1).data];
              }
              function luminance(channels) {
                const linear = channels.slice(0, 3).map(c => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
                return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
              }
              return elements.map(element => {
                const style = getComputedStyle(element);
                const fg = color(style.color); const bg = color(style.backgroundColor);
                const a = luminance(fg); const b = luminance(bg);
                return { sample: element.getAttribute('data-fallback-sample'), foreground: fg, background: bg,
                  contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
              });
            });
          }
          const normal = await inspect();
          const button = page.getByRole('button', { name: 'button: destructive', exact: true });
          await button.hover();
          const hover = await inspect();
          for (const sample of [...normal, ...hover]) {
            assert.equal(sample.foreground[3], 255, `${name}: text must be opaque`);
            assert.equal(sample.background[3], 255, `${name}: fallback background must be opaque`);
            assert.ok(sample.contrast >= report.minimumTextContrast, `${name}/${sample.sample}: contrast ${sample.contrast}`);
          }
          await page.mouse.move(0, 0);
          await page.keyboard.press('Tab');
          assert.equal(await button.evaluate(element => document.activeElement === element), true);
          const outline = await button.evaluate(element => {
            const style = getComputedStyle(element);
            return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
          });
          assert.notEqual(outline.style, 'none'); assert.ok(outline.width >= 2);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
          assert.deepEqual(pageErrors, []);
          writeFileSync(resolve(output, `${name}.png`), await stableScreenshot(() => page.screenshot({ animations: 'disabled', caret: 'hide' })));
          report.checks.push({ name, entry, width, dark, removedConditions: fallback.removedConditions,
            publishedSha256: createHash('sha256').update(original).digest('hex'), normal, hover, outline });
        } catch (error) {
          report.failures.push({ name, error: String(error), pageErrors });
        } finally { await page.close(); }
      }
    }
  }
  writeFileSync(resolve(output, 'fallback-contrast.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert.deepEqual(report.failures, []);
  assert.equal(report.checks.length, 12);
  console.info('Published primitive fallbacks: 12 stylesheet/viewport/theme cases passed, text contrast >= 4.5 and keyboard focus visible');
}
