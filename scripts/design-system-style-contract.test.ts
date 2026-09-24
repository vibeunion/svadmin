import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';

const read = (path: string) => readFileSync(resolve(import.meta.dir, '..', path), 'utf8');

function luminance(hex: string) {
  return [0.2126, 0.7152, 0.0722].reduce((total, weight, index) => {
    const offset = index * 2 + 1;
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return total + linear * weight;
  }, 0);
}

describe('cross-package design system', () => {
  it('keeps Lite palette aligned without introducing modern CSS dependencies', () => {
    const root = postcss.parse(read('packages/lite/src/lite.css'));
    const values: string[] = [];
    root.walkDecls((decl) => {
      values.push(decl.value);
      expect(decl.value).not.toMatch(/var\(|color-mix\(|oklch\(/);
    });
    for (const color of ['#635bff', '#0a2540', '#f6f9fc', '#e6ebf1']) {
      expect(values.join(' ')).toContain(color);
    }
    expect(values.join(' ')).not.toMatch(/#4f46e5|#0f172a|#f8fafc/);
  });

  it('keeps Lite text links readable on both neutral canvases', () => {
    let linkColor = '';
    postcss.parse(read('packages/lite/src/lite.css')).walkRules('a', (rule) => {
      rule.walkDecls('color', (decl) => { linkColor = decl.value; });
    });
    expect(linkColor).toMatch(/^#[\da-f]{6}$/);
    for (const background of ['#f6f9fc', '#f1f4f8', '#ffffff']) {
      expect((luminance(background) + 0.05) / (luminance(linkColor) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('accepts complete host colors in Editor instead of wrapping them in hsl()', () => {
    const css = read('packages/editor/src/styles/editor.css');
    expect(css).not.toContain('hsl(var(');
    expect(css).toContain('--editor-primary: var(--primary);');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('var(--svadmin-motion-fast, 150ms)');
    expect(css).not.toContain('transition: all');
  });

  it('retains Flow overrides before host semantics and standalone fallbacks', () => {
    const css = read('packages/flow/src/flow.css');
    expect(css).toContain('var(--svadmin-flow-accent, var(--primary, #635bff))');
    expect(css).toContain('var(--svadmin-flow-control-background, var(--card, #fff))');
    expect(css).toContain('var(--svadmin-flow-border, var(--border, #e6ebf1))');
    expect(css).toContain('text-align: start;');
  });

  it('keeps AI interaction timing shared and reduced-motion controls stationary', () => {
    const css = read('packages/ai-elements/src/ai.css');
    expect(css).toContain('var(--svadmin-motion-fast, 150ms)');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*:active:not\(:disabled\) \{ transform: none; \}/);
  });
});
