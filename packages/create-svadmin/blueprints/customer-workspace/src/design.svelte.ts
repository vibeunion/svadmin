import type { ThemeConfig } from '@svadmin/core';
import { initialPreset } from './design-selection';

interface DesignPreset {
  label: string;
  density: 'compact' | 'comfortable';
  width: 'wide' | 'default';
  formColumns: 1 | 2;
  detailLayout: 'list' | 'grid';
  theme: ThemeConfig;
}

export const designPresets = {
  operations: {
    label: '高密度运营', density: 'compact', width: 'wide',
    formColumns: 2, detailLayout: 'list',
    theme: { colorPreset: 'neutral', layoutPreset: 'clean-flat' },
  },
  enterprise: {
    label: '标准企业', density: 'comfortable', width: 'wide',
    formColumns: 2, detailLayout: 'grid',
    theme: { colorPreset: 'stripe', layoutPreset: 'clean-flat' },
  },
  collaboration: {
    label: '轻量协作', density: 'comfortable', width: 'default',
    formColumns: 1, detailLayout: 'list',
    theme: { colorPreset: 'green', layoutPreset: 'clean-flat' },
  },
} as const satisfies Record<string, DesignPreset>;

export type DesignPresetId = keyof typeof designPresets;
export const brand = $state({ name: '客户工作台', preset: initialPreset as DesignPresetId });

export function getDesign(): DesignPreset {
  return designPresets[brand.preset];
}
