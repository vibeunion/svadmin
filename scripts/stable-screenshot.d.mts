/** 两张连续、完全相同的帧才作为当前页面证据；不参考另一页面或基线。 */
export function stableScreenshot(capture: () => Promise<Buffer>, attempts?: number): Promise<Buffer>;
