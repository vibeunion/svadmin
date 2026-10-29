import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentRoot = resolve(process.cwd(), 'src/components');
const legacyAlias = /svadmin-u-[a-f0-9]{12}/u;

function componentFiles(): string[] {
  return readdirSync(componentRoot, { recursive: true })
    .filter((name): name is string => typeof name === 'string' && name.endsWith('.svelte'));
}

describe('component style source contract', () => {
  it('uses readable utility classes instead of legacy hashed aliases', () => {
    const violations = componentFiles().filter((name) =>
      legacyAlias.test(readFileSync(join(componentRoot, name), 'utf8')),
    );
    expect(violations).toEqual([]);
  });

  it('keeps the compatibility aliases in the published stylesheet', () => {
    const prelude = readFileSync(resolve(process.cwd(), 'src/styles/compatibility.prelude.css'), 'utf8');
    expect(prelude).toContain('.svadmin-u-60fbb7713999');
    expect(prelude).toContain('.svadmin-u-bfa603190748');
  });

  it('does not reintroduce bare palette colors or raw pixel typography', () => {
    const palette = /\b(?:text|bg|border|ring|fill|stroke|from|via|to|divide|outline|decoration|caret|accent|placeholder)-(?:green|emerald|teal|cyan|sky|amber|red|rose|orange|yellow|lime|blue|indigo|violet|fuchsia|purple|pink|zinc|gray|slate|neutral|stone)-(?:50|[1-9]00|950)\b/u;
    const rawTypography = /(?:font-size|line-height):\s*\d+(?:\.\d+)?px/u;
    const violations = componentFiles().flatMap((name) => {
      const source = readFileSync(join(componentRoot, name), 'utf8');
      return [
        ...(palette.test(source) ? [`${name}: bare palette color`] : []),
        ...(rawTypography.test(source) ? [`${name}: raw pixel typography`] : []),
      ];
    });
    expect(violations).toEqual([]);
  });
});