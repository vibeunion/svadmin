import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const output = resolve(process.argv[2] ?? 'test-results/ui-styles');

function readOptional(path) {
  try {
    return readFileSync(path);
  } catch {
    return undefined;
  }
}

// 诊断脚本在检查失败后运行；此时截图可能尚未生成。缺失证据要报告，而不是用
// ENOENT 覆盖掉真正的失败原因。
const resultsPayload = readOptional(resolve(output, 'results.json'));
if (resultsPayload === undefined) {
  console.info(JSON.stringify({ output, skipped: 'results.json was not written; nothing to diagnose' }, null, 2));
  process.exit(0);
}

const results = JSON.parse(resultsPayload.toString('utf8'));
const diagnostics = [];
const pending = [];

for (const { name } of results.failures) {
  const artifacts = {
    baseline: readOptional(resolve(output, `${name}-baseline.png`)),
    published: readOptional(resolve(output, `${name}-published.png`)),
    before: readOptional(resolve(output, `${name}-baseline.json`)),
    after: readOptional(resolve(output, `${name}-published.json`)),
  };
  const missing = Object.entries(artifacts)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);
  if (missing.length > 0) {
    diagnostics.push({ name, missing, note: 'evidence not written because the check failed before capture' });
    console.info(JSON.stringify({ name, missing }, null, 2));
    continue;
  }
  pending.push({
    name,
    baseline: artifacts.baseline,
    published: artifacts.published,
    before: JSON.parse(artifacts.before.toString('utf8')),
    after: JSON.parse(artifacts.after.toString('utf8')),
  });
}

async function comparePixels(page, { baseline, published }) {
  return page.evaluate(async ({ left, right }) => {
    const image = async (encoded) => {
      const bytes = Uint8Array.from(atob(encoded), (letter) => letter.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      if (bitmap.width * bitmap.height > 25_000_000) throw new Error('Evidence exceeds pixel diagnostic budget');
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas diagnostic context unavailable');
      context.drawImage(bitmap, 0, 0);
      const value = {
        width: bitmap.width,
        height: bitmap.height,
        data: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
      };
      bitmap.close();
      return value;
    };
    const a = await image(left);
    const b = await image(right);
    if (a.width !== b.width || a.height !== b.height) {
      return { dimensionsDiffer: true, before: [a.width, a.height], after: [b.width, b.height] };
    }
    let changed = 0;
    let xMin = a.width;
    let yMin = a.height;
    let xMax = 0;
    let yMax = 0;
    for (let offset = 0; offset < a.data.length; offset += 4) {
      if ([0, 1, 2, 3].every((channel) => a.data[offset + channel] === b.data[offset + channel])) continue;
      changed++;
      const pixel = offset / 4;
      const x = pixel % a.width;
      const y = Math.floor(pixel / a.width);
      xMin = Math.min(xMin, x);
      yMin = Math.min(yMin, y);
      xMax = Math.max(xMax, x);
      yMax = Math.max(yMax, y);
    }
    return { dimensionsDiffer: false, changedPixels: changed, bounds: changed ? [xMin, yMin, xMax, yMax] : null };
  }, { left: baseline.toString('base64'), right: published.toString('base64') });
}

// Chromium 只在确实有可诊断证据时才启动；证据缺失或未安装浏览器时安全退出。
let browser;
try {
  if (pending.length === 0) {
    console.info(JSON.stringify({ output, skipped: 'no complete evidence to diagnose' }, null, 2));
  } else {
    browser = await chromium.launch();
    const page = await browser.newPage();
    for (const { name, baseline, published, before, after } of pending) {
      const changedStyles = [];
      for (let index = 0; index < Math.max(before.length, after.length); index++) {
        if (JSON.stringify(before[index]) !== JSON.stringify(after[index])) {
          changedStyles.push({ index, before: before[index], after: after[index] });
        }
      }
      const pixels = await comparePixels(page, { baseline, published });
      diagnostics.push({
        name,
        encodedBytesIdentical: baseline.equals(published),
        pixels,
        changedStyleCount: changedStyles.length,
        changedStyles,
      });
      console.info(JSON.stringify({
        name,
        pixels,
        changedStyleCount: changedStyles.length,
        firstChanges: changedStyles.slice(0, 8),
      }, null, 2));
    }
  }
} finally {
  await browser?.close();
}

writeFileSync(resolve(output, 'diagnostics.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);