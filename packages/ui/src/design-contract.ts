/** 仅公开稳定语义；不向模型暴露 CSS、类名或内部 recipe 实现。 */
export const surfaceDesignContract = {
  version: 'svadmin/design-v1',
  metric: {
    tone: ['neutral', 'success', 'warning', 'danger', 'info'],
    density: ['comfortable', 'compact'],
  },
  table: {
    density: ['comfortable', 'compact'],
  },
  pageFamilies: ['list', 'form', 'detail', 'workspace', 'dashboard'],
  pageStates: ['ready', 'loading', 'empty', 'filtered-empty', 'error', 'forbidden'],
  composition: {
    maxPrimaryActions: 1,
    secondaryActions: 'overflow',
    destructiveActions: 'confirm',
    modalNesting: 0,
  },
} as const;

export type SurfaceTone = typeof surfaceDesignContract.metric.tone[number];
/** @deprecated Kept for source compatibility; product pages use one baseline rhythm. */
export type SurfaceDensity = typeof surfaceDesignContract.metric.density[number];
export type AdminPageFamily = typeof surfaceDesignContract.pageFamilies[number];
export type AdminPageState = typeof surfaceDesignContract.pageStates[number];
