import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stableScreenshot } from '../../../scripts/stable-screenshot.mjs';

export const captureOptions = Object.freeze({ fullPage: true, animations: 'disabled', caret: 'hide', type: 'png' });

async function diagnostics(page) {
  return page.evaluate(() => {
    const main = document.querySelector('[data-testid="specimen"]');
    const active = document.activeElement;
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      specimen: main?.getBoundingClientRect().toJSON() ?? null,
      state: { view: main?.getAttribute('data-view'), scenario: main?.getAttribute('data-scenario'), phase: document.querySelector('[data-testid="save-state"]')?.getAttribute('data-phase') },
      focus: { tag: active?.tagName, id: active?.id, testId: active?.getAttribute('data-testid') },
      fonts: document.fonts.status,
      animations: document.getAnimations().map(animation => ({
        name: 'animationName' in animation ? animation.animationName : animation.constructor.name,
        playState: animation.playState,
        timing: animation.effect?.getComputedTiming().progress ?? null,
      })),
    };
  });
}

export async function captureSpecimen(page, { id, directory }) {
  assert.match(id, /^[a-zA-Z0-9_-]+$/u);
  // 字体就绪后捕获整个页面，避免每次 locator 截图都重新滚动较高的样例。
  // 不修改产品 CSS，不裁掉错误区域，也不改变连续 PNG 字节必须一致的判定。
  await page.evaluate(async () => { await document.fonts.ready; });
  const frames = [];
  try {
    const png = await stableScreenshot(async () => {
      const before = await diagnostics(page);
      const bytes = await page.screenshot({ ...captureOptions });
      assert.ok(Buffer.isBuffer(bytes), 'Screenshot must return the actual PNG buffer');
      const after = await diagnostics(page);
      frames.push({ bytes, before, after, sha256: createHash('sha256').update(bytes).digest('hex') });
      return bytes;
    }, 8);
    return { png, attempts: frames.length, mode: 'full-page', lastFrame: frames.at(-1)?.after };
  } catch (error) {
    const target = resolve(directory, 'capture-diagnostics', id);
    mkdirSync(target, { recursive: true });
    for (const [index, frame] of frames.entries()) writeFileSync(resolve(target, `${index + 1}.png`), frame.bytes);
    writeFileSync(resolve(target, 'frames.json'), JSON.stringify(frames.map(({ bytes: _bytes, ...frame }) => frame), null, 2) + '\n');
    throw error;
  }
}
