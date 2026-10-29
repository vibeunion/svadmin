import type { ThemeConfig } from '@svadmin/core';
import { initialPreset } from './design-selection';

interface DesignPreset {
  label: string;
  width: 'wide' | 'default';
  formColumns: 1 | 2;
  detailLayout: 'list' | 'grid';
  theme: ThemeConfig;
}

export const designPresets = {
  operations: {
    label: '宽屏运营', width: 'wide',
    formColumns: 2, detailLayout: 'list',
    theme: { colorPreset: 'neutral', layoutPreset: 'clean-flat' },
  },
  enterprise: {
    label: '标准企业', width: 'wide',
    formColumns: 2, detailLayout: 'grid',
    theme: { colorPreset: 'arco', layoutPreset: 'clean-flat' },
  },
  collaboration: {
    label: '轻量协作', width: 'default',
    formColumns: 1, detailLayout: 'list',
    theme: { colorPreset: 'green', layoutPreset: 'clean-flat' },
  },
} as const satisfies Record<string, DesignPreset>;

export type DesignPresetId = keyof typeof designPresets;
export const brand = $state({ name: '客户工作台', preset: initialPreset as DesignPresetId });

export function getDesign(): DesignPreset {
  return designPresets[brand.preset];
}
