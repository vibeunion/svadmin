import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const file of ['lite.css', '../dist/lite.css']) {
  test(`${file}: file picker retains focus feedback, spacing and native overlay bounds`, () => {
    const css = readFileSync(resolve(import.meta.dir, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '');
    expect(css).toMatch(/\.lite-file-picker__native:focus\s*\+\s*\.lite-file-picker__visual\s*\{[^}]*box-shadow\s*:/u);
    expect(css).toMatch(/\.lite-file-picker__visual\s*>\s*\*\s*\+\s*\*\s*\{[^}]*margin-left\s*:\s*10px/u);
    const overlay = css.match(/\.lite-file-picker__native\s*\{([^}]*)\}/u)?.[1];
    expect(overlay).toBeDefined();
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      expect(overlay).toMatch(new RegExp(`\\b${edge}\\s*:\\s*0\\s*;`, 'u'));
    }
    expect(overlay).toMatch(/\bopacity\s*:\s*0\s*;/u);
    expect(css).not.toMatch(/:focus-visible\b|\bgap\s*:|\binset\s*:/u);
  });
}
