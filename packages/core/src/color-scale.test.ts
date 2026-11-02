import { describe, expect, it } from 'bun:test';
import {
  deriveColorPreset,
  exportThemeTokens,
  generateColorScale,
  hexToOklch,
  parseThemeTokens,
  pickReadableForeground,
} from './color-scale';

describe('color scale generation', () => {
  it('derives ten ordered steps that preserve the source hue', () => {
    const scale = generateColorScale('#165DFF');
    expect(scale).toHaveLength(10);
    expect(scale.map((step) => step.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const lightness = scale.map((step) => Number(/oklch\(([\d.]+)/.exec(step.value)?.[1]));
    expect(lightness).toEqual([...lightness].sort((a, b) => b - a));
    const source = hexToOklch('#165DFF');
    for (const step of scale) {
      const hue = Number(/oklch\([\d.]+ [\d.]+ ([\d.]+)\)/.exec(step.value)?.[1]);
      expect(Math.abs(hue - source.h)).toBeLessThan(1);
      expect(step.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('rejects non-hex input instead of emitting invalid CSS', () => {
    expect(() => generateColorScale('rgb(1,2,3)')).toThrow(TypeError);
    expect(() => hexToOklch('#12345')).toThrow(TypeError);
  });

  it('picks the higher-contrast foreground', () => {
    expect(pickReadableForeground('#FFFFFF')).toBe('#111111');
    expect(pickReadableForeground('#111111')).toBe('#FFFFFF');
  });
});

describe('derived presets', () => {
  it('exposes every token key the theme applier expects', () => {
    const preset = deriveColorPreset({ name: 'ocean', color: '#0EA5E9' });
    const required = [
      '--primary', '--primary-foreground', '--ring',
      '--sidebar-primary', '--sidebar-primary-foreground', '--sidebar-ring', '--chart-1',
    ];
    for (const key of required) {
      expect(preset.light[key]).toBeTruthy();
      expect(preset.dark[key]).toBeTruthy();
    }
    expect(preset.label).toBe('ocean');
    expect(preset.color).toBe('#0EA5E9');
  });

  it('is deterministic and never emits CSS syntax beyond color values', () => {
    const first = deriveColorPreset({ name: 'brand', color: '#165DFF' });
    const second = deriveColorPreset({ name: 'brand', color: '#165DFF' });
    expect(first).toEqual(second);
    for (const value of [...Object.values(first.light), ...Object.values(first.dark)]) {
      expect(value).not.toMatch(/[;{}]/);
    }
  });

  it('requires a name', () => {
    expect(() => deriveColorPreset({ name: '  ', color: '#165DFF' })).toThrow(TypeError);
  });
});

describe('theme token exchange', () => {
  const preset = deriveColorPreset({ name: 'brand', color: '#165DFF' });

  it('round-trips through the versioned document', () => {
    const document = exportThemeTokens([preset]);
    expect(document.version).toBe(1);
    const [parsed] = parseThemeTokens(JSON.parse(JSON.stringify(document)));
    expect(parsed).toEqual(preset);
  });

  it('rejects unsupported versions, duplicate names, and CSS injection', () => {
    expect(() => parseThemeTokens({ version: 2, presets: [] })).toThrow(/version/);
    expect(() => parseThemeTokens({ version: 1, presets: [preset, preset] })).toThrow(/Duplicate/);
    expect(() => parseThemeTokens({
      version: 1,
      presets: [{ ...preset, light: { '--primary': 'red; background: url(x)' } }],
    })).toThrow(/color token/);
    expect(() => parseThemeTokens({
      version: 1,
      presets: [{ ...preset, light: { 'not-a-var': '#fff' } }],
    })).toThrow(/invalid CSS variable/);
  });

  it('rejects non-object payloads before mutating anything', () => {
    expect(() => parseThemeTokens(null)).toThrow(TypeError);
    expect(() => parseThemeTokens([])).toThrow(TypeError);
  });
});