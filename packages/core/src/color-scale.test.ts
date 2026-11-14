import { describe, expect, it } from 'bun:test';
import {
  deriveColorPreset,
  exportThemeTokens,
  generateColorScale,
  hexToOklch,
  interactionRamps,
  parseThemeTokens,
  pickReadableForeground,
  withPrimaryInteractionRamps,
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

  it('keeps the written Arco default ramps and derives the rest from the OKLCH step', () => {
    expect(interactionRamps('#165DFF')).toEqual({
      hover: '#4080FF',
      pressed: '#0E42D2',
      disabled: '#94BFFF',
    });
    expect(interactionRamps('#3C7EFF')).toEqual({
      hover: '#306FFF',
      pressed: '#689FFF',
      disabled: '#0E32A6',
    });
    const custom = interactionRamps('#0EA5E9');
    expect(custom.hover.startsWith('oklch(')).toBe(true);
    expect(custom.pressed.startsWith('oklch(')).toBe(true);
    const source = hexToOklch('#0EA5E9');
    const hover = Number(/oklch\(([\d.]+)/.exec(custom.hover)?.[1]);
    const pressed = Number(/oklch\(([\d.]+)/.exec(custom.pressed)?.[1]);
    expect(hover).toBeGreaterThan(source.l);
    expect(pressed).toBeLessThan(source.l);
    const preset = deriveColorPreset({ name: 'ocean', color: '#0EA5E9' });
    expect(preset.light['--primary-5']).toBeTruthy();
    expect(preset.dark['--primary-7']).toBeTruthy();
    expect(withPrimaryInteractionRamps({ '--primary': '#165DFF' })['--primary-5']).toBe('#4080FF');
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