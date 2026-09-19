import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evidence, root, servePreview } from './run.mjs';

// 独立读取真实组件；不向标签注入修正样式，也不复用配方对象生成预期值。
const { chromium, expect } = createRequire(resolve(root, 'package.json'))('@playwright/test');
const bindings = { success: '--success', warning: '--warning', danger: '--destructive', info: '--info', neutral: '--muted-foreground' };
const results = [];
let browser;
let server;
try {
  server = await servePreview();
  browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto(`http://127.0.0.1:4179/?view=components&state=ready&theme=${theme}&locale=en`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-svadmin-status]')).toHaveCount(5);
      const colors = await page.locator('[data-svadmin-status]').evaluateAll((nodes, tokens) => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Color projection unavailable');
        const rgb = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
        return nodes.map(node => {
          const status = node.getAttribute('data-svadmin-status');
          if (!Object.hasOwn(tokens, status)) throw new Error('Unknown status');
          const probe = document.createElement('span'); probe.hidden = true;
          node.parentElement.append(probe);
          try {
            const expected = {};
            for (const [property, percentage, base] of [['color', 35, '--foreground'], ['backgroundColor', 10, '--card'], ['borderTopColor', 25, '--card']]) {
              probe.style[property] = `color-mix(in oklab, var(${tokens[status]}) ${percentage}%, var(${base}))`;
              expected[property] = rgb(getComputedStyle(probe)[property]);
            }
            const style = getComputedStyle(node);
            return { status, actual: { color: rgb(style.color), backgroundColor: rgb(style.backgroundColor), borderTopColor: rgb(style.borderTopColor) }, expected };
          } finally { probe.remove(); }
        });
      }, bindings);
      for (const entry of colors) assert.deepEqual(entry.actual, entry.expected, `${theme}/${entry.status}: semantic token blend changed`);
      // 默认浅色主题中绿/琥珀/红/蓝必须保持可辨，不接受全部偏向粉色。
      if (theme === 'light') {
        const color = status => colors.find(entry => entry.status === status).actual.backgroundColor;
        const green = color('success'); assert.ok(green[1] > green[0] && green[1] > green[2]);
        const amber = color('warning'); assert.ok(amber[0] > amber[2] && amber[1] > amber[2]);
        const red = color('danger'); assert.ok(red[0] > red[1] && red[0] > red[2]);
        const blue = color('info'); assert.ok(blue[2] > blue[0] && blue[2] > blue[1]);
      }
      results.push({ theme, passed: true, colors });
    } catch (error) { results.push({ theme, passed: false, error: String(error) }); }
    finally { await context.close(); }
  }
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.httpServer.close(done));
  writeFileSync(resolve(evidence, 'status-colors.json'), JSON.stringify(results, null, 2) + '\n');
}
console.info(JSON.stringify({ statusColors: results }));
assert.equal(results.length, 2);
assert.ok(results.every(entry => entry.passed), 'Status colors do not match the approved semantic blends');
