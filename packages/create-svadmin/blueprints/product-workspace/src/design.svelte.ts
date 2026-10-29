import type { ThemeConfig } from '@svadmin/core';

export const brand = $state({ name: 'Product workspace' });

export function getDesign(): { theme: ThemeConfig } {
  return { theme: { colorPreset: 'arco', layoutPreset: 'clean-flat' } };
}
