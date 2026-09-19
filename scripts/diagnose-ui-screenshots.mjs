import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const output = resolve(process.argv[2] ?? 'docs/pr-evidence/panda-styles');
const results = JSON.parse(readFileSync(resolve(output, 'results.json'), 'utf8'));
const diagnostics = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { name } of results.failures) {
    const baseline = readFileSync(resolve(output, `${name}-baseline.png`));
    const published = readFileSync(resolve(output, `${name}-published.png`));
    const before = JSON.parse(readFileSync(resolve(output, `${name}-baseline.json`), 'utf8'));
    const after = JSON.parse(readFileSync(resolve(output, `${name}-published.json`), 'utf8'));
    const changedStyles = [];
    for (let index = 0; index < Math.max(before.length, after.length); index++) {
      if (JSON.stringify(before[index]) !== JSON.stringify(after[index])) changedStyles.push({ index, before: before[index], after: after[index] });
    }
    const pixels = await page.evaluate(async ({ left, right }) => {
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
        const value = { width: bitmap.width, height: bitmap.height, data: context.getImageData(0, 0, bitmap.width, bitmap.height).data };
        bitmap.close();
        return value;
      };
      const a = await image(left);
      const b = await image(right);
      if (a.width !== b.width || a.height !== b.height) return { dimensionsDiffer: true, before: [a.width, a.height], after: [b.width, b.height] };
      let changed = 0;
      let xMin = a.width, yMin = a.height, xMax = 0, yMax = 0;
      for (let offset = 0; offset < a.data.length; offset += 4) {
        if ([0, 1, 2, 3].every((channel) => a.data[offset + channel] === b.data[offset + channel])) continue;
        changed++;
        const pixel = offset / 4;
        const x = pixel % a.width;
        const y = Math.floor(pixel / a.width);
        xMin = Math.min(xMin, x); yMin = Math.min(yMin, y);
        xMax = Math.max(xMax, x); yMax = Math.max(yMax, y);
      }
      return { dimensionsDiffer: false, changedPixels: changed, bounds: changed ? [xMin, yMin, xMax, yMax] : null };
    }, { left: baseline.toString('base64'), right: published.toString('base64') });
    diagnostics.push({ name, encodedBytesIdentical: baseline.equals(published), pixels, changedStyleCount: changedStyles.length, changedStyles });
    console.info(JSON.stringify({ name, pixels, changedStyleCount: changedStyles.length, firstChanges: changedStyles.slice(0, 8) }, null, 2));
  }
} finally { await browser.close(); }
writeFileSync(resolve(output, 'diagnostics.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);
