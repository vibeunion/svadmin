import { describe, expect, it } from 'vitest';
import { defaultAdminLayoutConfig, resolveAdminLayoutConfig } from './layout-config.js';

describe('admin layout config', () => {
  it('uses Vben-aligned shell defaults', () => {
    expect(resolveAdminLayoutConfig()).toEqual(defaultAdminLayoutConfig);
    expect(defaultAdminLayoutConfig).toMatchObject({
      sidebarWidth: 224,
      collapsedSidebarWidth: 60,
      headerHeight: 50,
      contentMaxWidth: 'none',
      sidebarTheme: 'dark',
    });
  });

  it('accepts application overrides and rejects invalid dimensions', () => {
    expect(resolveAdminLayoutConfig({
      sidebarWidth: 248,
      collapsedSidebarWidth: -1,
      headerHeight: 56,
      contentMaxWidth: '1440px',
      contentPadding: 'compact',
      sidebarTheme: 'light',
    })).toEqual({
      sidebarWidth: 248,
      collapsedSidebarWidth: 60,
      headerHeight: 56,
      contentMaxWidth: '1440px',
      contentPadding: 'compact',
      sidebarTheme: 'light',
    });
  });
});
