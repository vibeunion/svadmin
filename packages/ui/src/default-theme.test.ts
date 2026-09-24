import { describe, expect, it } from 'vitest';
import { resolveAdminThemeConfig } from './default-theme.js';

describe('AdminApp default theme', () => {
  it('defaults the UI layout without forcing a color selection', () => {
    expect(resolveAdminThemeConfig()).toEqual({ layoutPreset: 'clean-flat' });
    expect(resolveAdminThemeConfig({ colorPreset: 'green' })).toEqual({
      layoutPreset: 'clean-flat', colorPreset: 'green',
    });
  });

  it('preserves explicit legacy layouts and consumer overrides without mutation', () => {
    const config = { layoutPreset: 'default', cssOverrides: { '--radius': '4px' } } as const;
    expect(resolveAdminThemeConfig(config)).toEqual(config);
    expect(resolveAdminThemeConfig(config)).not.toBe(config);
  });
});
