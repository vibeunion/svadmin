import type { SurfaceDensity, SurfaceTone } from './design-contract.js';

// 有限语义变体与静态 CSS 配套；不接受模型提供的 class/style。
export function surfaceMetric({
  tone = 'neutral', density = 'comfortable',
}: { tone?: SurfaceTone | undefined; density?: SurfaceDensity | undefined } = {}) {
  return {
    root: 'svadmin-surface-metric__root',
    card: `svadmin-surface-metric__card svadmin-surface-tone--${tone} svadmin-surface-density--${density}`,
    description: 'svadmin-surface-metric__description',
    state: `svadmin-surface-metric__state svadmin-surface-tone--${tone} svadmin-surface-density--${density}`,
  };
}

export function surfaceTable({ density = 'comfortable' }: { density?: SurfaceDensity | undefined } = {}) {
  const variant = `svadmin-surface-density--${density}`;
  return {
    root: 'svadmin-surface-table__root',
    header: `svadmin-surface-table__header ${variant}`,
    content: `svadmin-surface-table__content ${variant}`,
    head: `svadmin-surface-table__head ${variant}`,
    cell: `svadmin-surface-table__cell ${variant}`,
    state: `svadmin-surface-table__state ${variant}`,
  };
}
