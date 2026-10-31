import { describe, expect, it } from 'bun:test';

/**
 * Contract for the opt-in token theme stylesheet.
 *
 * `lite.css` is scanned by the IE11 contract and must stay free of custom
 * properties; `lite-code-theme.css` is the modern layer that carries them. Keep
 * both token class lists in sync with `rich-content.ts` and keep the dark preset
 * covering every variable, otherwise hosts silently lose a colour.
 */
const TOKENS = ['comment', 'keyword', 'string', 'number', 'function', 'type'] as const;

const themeSource = await Bun.file(new URL('./lite-code-theme.css', import.meta.url)).text();
const baseSource = await Bun.file(new URL('./lite.css', import.meta.url)).text();

describe('Lite token theme stylesheet', () => {
  it('defines a variable per token class', () => {
    for (const token of TOKENS) {
      expect(themeSource).toContain(`--lite-token-${token}:`);
      expect(themeSource).toContain(`.tok-${token}`);
      expect(themeSource).toContain(`var(--lite-token-${token}, #`);
    }
  });

  it('overrides every variable in the dark preset', () => {
    const darkBlock = themeSource.slice(themeSource.indexOf('.lite-dark {'));
    expect(darkBlock.length).toBeGreaterThan(0);
    for (const token of TOKENS) {
      expect(darkBlock).toContain(`--lite-token-${token}:`);
    }
  });

  it('covers every Lite surface that renders highlighted code', () => {
    for (const surface of [
      '.lite-markdown-preview',
      '.lite-rich-preview',
      '.lite-insight-content',
      '.lite-comments__rich',
      '.lite-notification-center__rich',
      '.lite-activity-rich',
    ]) {
      expect(themeSource).toContain(surface);
      expect(baseSource).toContain(surface);
    }
  });

  it('keeps the IE11 baseline stylesheet free of custom properties', () => {
    // Comments name the pattern, so only declarations count.
    expect(baseSource).not.toMatch(/^\s*[a-z-]+\s*:\s*var\(/mu);
  });
});