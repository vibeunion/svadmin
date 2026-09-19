import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { isFrozenCompatibilityCss } from './frozen-css-compatibility.js';

const examplePath = 'example/src/compatibility.css';
const exampleCss = readFileSync(new URL('../example/src/compatibility.css', import.meta.url), 'utf8');

describe('frozen compatibility asset boundary', () => {
  it('accepts only the reviewed bytes of the two legacy generated assets', () => {
    expect(isFrozenCompatibilityCss(examplePath, exampleCss)).toBe(true);
    const aiPath = 'packages/ai-elements/src/utilities.css';
    const aiCss = readFileSync(new URL(`../${aiPath}`, import.meta.url), 'utf8');
    expect(isFrozenCompatibilityCss(aiPath, aiCss)).toBe(true);
  });

  it('rejects even a small addition to a frozen asset', () => {
    expect(() => isFrozenCompatibilityCss(examplePath, `${exampleCss}\n.new { color: red; }`))
      .toThrow('frozen compatibility CSS changed');
  });

  it('never exempts authored files or similarly named files', () => {
    for (const path of ['example/src/app.css', 'example/src/pages/compatibility.css', '../example/src/compatibility.css']) {
      expect(isFrozenCompatibilityCss(path, exampleCss)).toBe(false);
    }
  });

  it('normalizes Windows separators without broadening the path allowlist', () => {
    expect(isFrozenCompatibilityCss(examplePath.replaceAll('/', '\\'), exampleCss)).toBe(true);
  });
});
