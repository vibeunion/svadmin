import type { SurfaceTone, SurfaceDensity } from "./design-contract.js";

export const tone: SurfaceTone = "success";
export const density: SurfaceDensity = "compact";

// @ts-expect-error 公开契约不接受任意品牌颜色。
export const invalidTone: SurfaceTone = "brand-typo";

// @ts-expect-error 公开契约限定密度枚举。
export const invalidDensity: SurfaceDensity = "banana";
