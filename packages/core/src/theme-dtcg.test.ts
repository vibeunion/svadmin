import { describe, expect, it } from 'bun:test';
import { deriveColorPreset } from './color-scale';
import {
  auditThemeContrast,
  dtcgPathToCssVar,
  failingContrastChecks,
  formatContrastReport,
  parseDtcgTheme,
  presetFromDtcg,
} from './theme-dtcg';

const dtcg = {
  color: {
    light: {
      primary: { $type: 'color', $value: '#1D4ED8' },
      primaryForeground: { $type: 'color', $value: '#FFFFFF' },
      card: { $type: 'color', $value: '{color.light.surface}' },
      surface: { $type: 'color', $value: '#F8FAFC' },
      radius: { $type: 'dimension', $value: '8px' },
      brokenAlias: { $type: 'color', $value: '{color.light.missing}' },
    },
    dark: {
      primary: { $type: 'color', $value: '#93C5FD' },
      primaryForeground: { $type: 'color', $value: '#0B1120' },
    },
  },
};

describe('dtcg path mapping', () => {
  it('maps token paths to kebab-case CSS variables', () => {
    expect(dtcgPathToCssVar('color.primary')).toBe('--primary');
    expect(dtcgPathToCssVar('color.primaryForeground')).toBe('--primary-foreground');
    expect(dtcgPathToCssVar('color.sidebar.primary-foreground')).toBe('--sidebar-primary-foreground');
    expect(dtcgPathToCssVar('space.md')).toBe('--space-md');
    expect(dtcgPathToCssVar('color')).toBeUndefined();
  });
});

describe('dtcg theme parsing', () => {
  it('reads light/dark groups and resolves aliases', () => {
    const theme = parseDtcgTheme(dtcg);
    expect(theme.light['--primary']).toBe('#1D4ED8');
    expect(theme.light['--card']).toBe('#F8FAFC');
    expect(theme.dark['--primary']).toBe('#93C5FD');
    expect(theme.dark['--primary-foreground']).toBe('#0B1120');
  });

  it('reports unsupported types and unresolved aliases instead of guessing', () => {
    const theme = parseDtcgTheme(dtcg);
    expect(theme.issues).toContainEqual({ path: 'color.light.radius', reason: 'unsupported-type' });
    expect(theme.issues).toContainEqual({ path: 'color.light.brokenAlias', reason: 'unresolved-alias' });
    expect(theme.light['--radius']).toBeUndefined();
  });

  it('mirrors a single-mode tree into both modes', () => {
    const theme = parseDtcgTheme({ color: { primary: { $value: '#123456' } } });
    expect(theme.light['--primary']).toBe('#123456');
    expect(theme.dark['--primary']).toBe('#123456');
  });

  it('rejects documents without color tokens', () => {
    expect(() => parseDtcgTheme({})).toThrow(/no color tokens/);
    expect(() => parseDtcgTheme('nope')).toThrow(TypeError);
  });

  it('builds a complete preset, keeping generated keys the document does not declare', () => {
    const preset = presetFromDtcg({ name: 'imported', color: '#1D4ED8', document: dtcg });
    expect(preset.name).toBe('imported');
    expect(preset.light['--primary']).toBe('#1D4ED8');
    expect(preset.light['--chart-1']).toBeTruthy();
    expect(preset.dark['--chart-5']).toBeTruthy();
  });
});

describe('contrast audit', () => {
  it('keeps generated palettes at or above AA', () => {
    for (const color of ['#165DFF', '#22C55E', '#F97316', '#111827']) {
      const preset = deriveColorPreset({ name: color, color });
      expect(failingContrastChecks(auditThemeContrast(preset))).toEqual([]);
    }
  });

  it('fails unreadable token pairs', () => {
    const preset = deriveColorPreset({ name: 'low', color: '#7DD3FC' });
    const broken = {
      ...preset,
      light: { ...preset.light, '--primary': '#E0F2FE', '--primary-foreground': '#FFFFFF' },
    };
    const failures = failingContrastChecks(auditThemeContrast(broken));
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((failure) => failure.mode === 'light')).toBe(true);
  });

  it('renders a markdown report with the mode and ratio', () => {
    const checks = auditThemeContrast(deriveColorPreset({ name: 'brand', color: '#165DFF' }));
    const report = formatContrastReport('brand', checks);
    expect(report).toContain('| Mode | Pair | Colors | Ratio | AA |');
    expect(report).toContain('| light | primary text |');
  });
});