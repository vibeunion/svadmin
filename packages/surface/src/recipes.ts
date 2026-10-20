import type { SurfaceTone } from './design-contract.js';

// 有限语义变体与静态 CSS 配套；不接受模型提供的 class/style。
export function surfaceMetric({
  tone = 'neutral',
}: { tone?: SurfaceTone | undefined } = {}) {
  return {
    root: 'svadmin-surface-metric__root',
    card: `svadmin-surface-metric__card svadmin-surface-tone--${tone}`,
    description: 'svadmin-surface-metric__description',
    state: `svadmin-surface-metric__state svadmin-surface-tone--${tone}`,
  };
}

export function surfaceTable() {
  return {
    root: 'svadmin-surface-table__root',
    header: 'svadmin-surface-table__header',
    content: 'svadmin-surface-table__content',
    head: 'svadmin-surface-table__head',
    cell: 'svadmin-surface-table__cell',
    state: 'svadmin-surface-table__state',
  };
}
