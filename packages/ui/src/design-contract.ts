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
} as const;

export type SurfaceTone = typeof surfaceDesignContract.metric.tone[number];
export type SurfaceDensity = typeof surfaceDesignContract.metric.density[number];
