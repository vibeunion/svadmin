import type { SurfaceTone } from "./design-contract.js";

export const tone: SurfaceTone = "success";

// @ts-expect-error 公开契约不接受任意品牌颜色。
export const invalidTone: SurfaceTone = "brand-typo";
