import { describe, test, expect, beforeEach } from 'bun:test';

/**
 * Unit tests for theme strategy logic + color preset system.
 * Since theme.svelte.ts uses Svelte 5 runes ($state), we test the pure
 * strategy logic here without importing the module directly.
 */

// ── Replicate the pure applyTheme logic ──────────────────────
import { requireValue } from '../../../scripts/test-assertions';

type ThemeMode = 'light' | 'dark' | 'system';
type ThemeStrategy = 'standard' | 'dark-first';

interface ColorPreset {
  name: string;
  label: string;
  color: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface ThemeConfig {
  strategy?: ThemeStrategy;
  cssOverrides?: Record<string, string>;
  disableColorScheme?: boolean;
  colorPreset?: ColorPreset | string;
}

// Simulate DOM state
let classes: Set<string>;
let cssVars: Map<string, string>;
let colorScheme: string;

function resetMocks() {
  classes = new Set();
  cssVars = new Map();
  colorScheme = '';
}

/** Pure version of applyTheme logic extracted from theme.svelte.ts */
function applyTheme(mode: ThemeMode, config: ThemeConfig, systemPreference: 'light' | 'dark' = 'light') {
  const resolved = mode === 'system' ? systemPreference : mode;
  const strategy = config.strategy ?? 'standard';

  if (strategy === 'dark-first') {
    if (resolved === 'light') classes.add('light');
    else classes.delete('light');
    classes.delete('dark');
  } else {
    if (resolved === 'dark') classes.add('dark');
    else classes.delete('dark');
    classes.delete('light');
  }

  if (!config.disableColorScheme) {
    colorScheme = resolved;
  }
}

function applyCssOverrides(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries(overrides)) {
    const cssVar = key.startsWith('--') ? key : `--${key}`;
    cssVars.set(cssVar, value);
  }
}

function clearCssOverrides(config: ThemeConfig, keys?: string[]) {
  if (keys) {
    for (const key of keys) {
      const cssVar = key.startsWith('--') ? key : `--${key}`;
      cssVars.delete(cssVar);
    }
  } else if (config.cssOverrides) {
    for (const key of Object.keys(config.cssOverrides)) {
      const cssVar = key.startsWith('--') ? key : `--${key}`;
      cssVars.delete(cssVar);
    }
  }
}

// ── Replicate color preset logic ─────────────────────────────

const builtinPresets: Record<string, ColorPreset> = {
  neutral: {
    name: 'neutral', label: 'Neutral', color: '#71717a',
    light: { '--primary': 'oklch(0.205 0.006 286)', '--ring': 'oklch(0.205 0.006 286)' },
    dark:  { '--primary': 'oklch(0.922 0.004 286)', '--ring': 'oklch(0.556 0.004 286)' },
  },
  indigo: {
    name: 'indigo', label: 'Indigo', color: '#4f46e5',
    light: { '--primary': 'oklch(0.488 0.243 264.376)', '--ring': 'oklch(0.488 0.243 264.376)' },
    dark:  { '--primary': 'oklch(0.585 0.233 264)', '--ring': 'oklch(0.55 0.18 264)' },
  },
};

function resolvePreset(preset: ColorPreset | string): ColorPreset | undefined {
  if (typeof preset === 'string') return builtinPresets[preset];
  return preset;
}

function applyColorPreset(preset: ColorPreset, mode: ThemeMode, systemPref: 'light' | 'dark' = 'light') {
  const resolved = mode === 'system' ? systemPref : mode;
  const vars = resolved === 'dark' ? preset.dark : preset.light;
  for (const [key, value] of Object.entries(vars)) {
    const cssVar = key.startsWith('--') ? key : `--${key}`;
    cssVars.set(cssVar, value);
  }
}

function registerColorPreset(preset: ColorPreset) {
  builtinPresets[preset.name] = preset;
}

/** Simulate configureTheme: apply preset first, then cssOverrides */
function configureTheme(config: ThemeConfig, mode: ThemeMode = 'light', systemPref: 'light' | 'dark' = 'light') {
  applyTheme(mode, config, systemPref);
  if (config.colorPreset) {
    const preset = resolvePreset(config.colorPreset);
    if (preset) applyColorPreset(preset, mode, systemPref);
  }
  if (config.cssOverrides) {
    applyCssOverrides(config.cssOverrides);
  }
}

// ── Tests ────────────────────────────────────────────────────

describe('Theme Strategy — standard (light-first)', () => {
  beforeEach(resetMocks);

  test('dark mode adds "dark" class', () => {
    applyTheme('dark', { strategy: 'standard' });
    expect(classes.has('dark')).toBe(true);
    expect(classes.has('light')).toBe(false);
  });

  test('light mode has no mode class', () => {
    applyTheme('light', { strategy: 'standard' });
    expect(classes.has('dark')).toBe(false);
    expect(classes.has('light')).toBe(false);
  });

  test('system mode resolves to system preference', () => {
    applyTheme('system', { strategy: 'standard' }, 'dark');
    expect(classes.has('dark')).toBe(true);
  });

  test('sets color-scheme by default', () => {
    applyTheme('dark', { strategy: 'standard' });
    expect(colorScheme).toBe('dark');
  });
});

describe('Theme Strategy — dark-first', () => {
  beforeEach(resetMocks);

  test('light mode adds "light" class', () => {
    applyTheme('light', { strategy: 'dark-first' });
    expect(classes.has('light')).toBe(true);
    expect(classes.has('dark')).toBe(false);
  });

  test('dark mode has no mode class', () => {
    applyTheme('dark', { strategy: 'dark-first' });
    expect(classes.has('light')).toBe(false);
    expect(classes.has('dark')).toBe(false);
  });

  test('system mode resolves correctly', () => {
    applyTheme('system', { strategy: 'dark-first' }, 'light');
    expect(classes.has('light')).toBe(true);
  });

  test('disableColorScheme prevents color-scheme change', () => {
    applyTheme('dark', { strategy: 'dark-first', disableColorScheme: true });
    expect(colorScheme).toBe('');
  });
});

describe('CSS Overrides', () => {
  beforeEach(resetMocks);

  test('applies CSS variables with -- prefix', () => {
    applyCssOverrides({
      '--primary': 'rgb(108, 124, 255)',
      '--background': '5, 8, 17',
    });
    expect(cssVars.get('--primary')).toBe('rgb(108, 124, 255)');
    expect(cssVars.get('--background')).toBe('5, 8, 17');
  });

  test('auto-prefixes keys without --', () => {
    applyCssOverrides({ 'primary': 'red' });
    expect(cssVars.get('--primary')).toBe('red');
  });

  test('clearCssOverrides removes all', () => {
    const config: ThemeConfig = {
      cssOverrides: { '--a': '1', '--b': '2' },
    };
    applyCssOverrides(requireValue(config.cssOverrides));
    expect(cssVars.size).toBe(2);

    clearCssOverrides(config);
    expect(cssVars.size).toBe(0);
  });

  test('clearCssOverrides with specific keys', () => {
    const config: ThemeConfig = {
      cssOverrides: { '--a': '1', '--b': '2' },
    };
    applyCssOverrides(requireValue(config.cssOverrides));
    clearCssOverrides(config, ['--a']);
    expect(cssVars.has('--a')).toBe(false);
    expect(cssVars.has('--b')).toBe(true);
  });
});

describe('Color Presets', () => {
  beforeEach(resetMocks);

  test('resolvePreset returns built-in by name', () => {
    const preset = resolvePreset('indigo');
    expect(preset).toBeDefined();
    expect(requireValue(preset).name).toBe('indigo');
    expect(requireValue(preset).label).toBe('Indigo');
  });

  test('resolvePreset returns undefined for unknown name', () => {
    expect(resolvePreset('nonexistent')).toBeUndefined();
  });

  test('resolvePreset returns custom object directly', () => {
    const custom: ColorPreset = {
      name: 'custom', label: 'Custom', color: '#ff0000',
      light: { '--primary': 'red' },
      dark: { '--primary': 'darkred' },
    };
    expect(resolvePreset(custom)).toBe(custom);
  });

  test('applyColorPreset sets light vars in light mode', () => {
    const preset = builtinPresets['indigo'];
    applyColorPreset(preset, 'light');
    expect(cssVars.get('--primary')).toBe('oklch(0.488 0.243 264.376)');
    expect(cssVars.get('--ring')).toBe('oklch(0.488 0.243 264.376)');
  });

  test('applyColorPreset sets dark vars in dark mode', () => {
    const preset = builtinPresets['indigo'];
    applyColorPreset(preset, 'dark');
    expect(cssVars.get('--primary')).toBe('oklch(0.585 0.233 264)');
    expect(cssVars.get('--ring')).toBe('oklch(0.55 0.18 264)');
  });

  test('applyColorPreset resolves system mode', () => {
    const preset = builtinPresets['neutral'];
    applyColorPreset(preset, 'system', 'dark');
    expect(cssVars.get('--primary')).toBe('oklch(0.922 0.004 286)');
  });

  test('registerColorPreset adds a new preset', () => {
    const custom: ColorPreset = {
      name: 'teal', label: 'Teal', color: '#14b8a6',
      light: { '--primary': 'oklch(0.6 0.15 180)' },
      dark: { '--primary': 'oklch(0.7 0.12 180)' },
    };
    registerColorPreset(custom);
    expect(builtinPresets['teal']).toBeDefined();
    expect(requireValue(resolvePreset('teal')).label).toBe('Teal');
    // Clean up
    delete builtinPresets['teal'];
  });

  test('registerColorPreset overwrites existing preset', () => {
    const original = { ...builtinPresets['neutral'] };
    registerColorPreset({
      name: 'neutral', label: 'My Neutral', color: '#000',
      light: { '--primary': 'black' },
      dark: { '--primary': 'white' },
    });
    expect(builtinPresets['neutral'].label).toBe('My Neutral');
    // Restore
    builtinPresets['neutral'] = original;
  });
});

describe('configureTheme — integrated', () => {
  beforeEach(resetMocks);

  test('applies preset by name', () => {
    configureTheme({ colorPreset: 'indigo' }, 'light');
    expect(cssVars.get('--primary')).toBe('oklch(0.488 0.243 264.376)');
  });

  test('applies preset object directly', () => {
    configureTheme({
      colorPreset: {
        name: 'test', label: 'Test', color: '#f00',
        light: { '--primary': 'TEST_LIGHT' },
        dark: { '--primary': 'TEST_DARK' },
      },
    }, 'dark');
    expect(cssVars.get('--primary')).toBe('TEST_DARK');
  });

  test('cssOverrides take priority over preset', () => {
    configureTheme({
      colorPreset: 'indigo',
      cssOverrides: { '--primary': 'OVERRIDE' },
    }, 'light');
    // cssOverrides applied after preset, so should win
    expect(cssVars.get('--primary')).toBe('OVERRIDE');
    // Ring comes from preset (not overridden)
    expect(cssVars.get('--ring')).toBe('oklch(0.488 0.243 264.376)');
  });

  test('unknown preset name is silently skipped', () => {
    configureTheme({ colorPreset: 'doesnotexist' }, 'light');
    expect(cssVars.size).toBe(0);
  });
});
