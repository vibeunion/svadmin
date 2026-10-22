import { afterEach, describe, expect, it } from 'vitest';
import { resetContext, resetTheme, setColorTheme, type ResourceDefinition } from '@svadmin/core';
import AboutSettingsHarness from '../../test/fixtures/AboutSettingsHarness.svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';

const resources: ResourceDefinition[] = [
  { name: 'visible', label: 'Visible resource', fields: [], meta: { aboutVisible: true } },
  { name: 'hidden', label: 'Hidden resource', fields: [], meta: { aboutVisible: false } },
  { name: 'legacy', label: 'Legacy resource', fields: [] },
];

afterEach(() => {
  resetContext();
  resetTheme();
});

describe('AboutSettings environment metadata', () => {
  it('filters resources hidden from the about page and displays their labels', async () => {
    const view = renderWithI18n(AboutSettingsHarness, { resources }, 'en');

    expect(await view.findByText('Visible resource')).toBeTruthy();
    expect(view.getByText('Legacy resource')).toBeTruthy();
    expect(view.queryByText('Hidden resource')).toBeNull();
    expect(view.queryByText('visible')).toBeNull();
  });

  it('localizes theme and accent values', async () => {
    setColorTheme('violet');
    const view = renderWithI18n(AboutSettingsHarness, { resources }, 'zh-CN');

    expect(await view.findByText('紫罗兰色')).toBeTruthy();
    expect(view.queryByText('violet')).toBeNull();
  });
});