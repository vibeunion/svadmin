/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface SurfaceMetricVariant {
  /**
 * @default "neutral"
 */
tone: "neutral" | "success" | "warning" | "danger" | "info"
/**
 * @default "comfortable"
 */
density: "comfortable" | "compact"
}

type SurfaceMetricVariantMap = {
  [key in keyof SurfaceMetricVariant]: Array<SurfaceMetricVariant[key]>
}

type SurfaceMetricSlot = "root" | "card" | "description" | "state"

export type SurfaceMetricVariantProps = {
  [key in keyof SurfaceMetricVariant]?: ConditionalValue<SurfaceMetricVariant[key]> | undefined
}

export interface SurfaceMetricRecipe {
  __slot: SurfaceMetricSlot
  __type: SurfaceMetricVariantProps
  (props?: SurfaceMetricVariantProps): Pretty<Record<SurfaceMetricSlot, string>>
  raw: (props?: SurfaceMetricVariantProps) => SurfaceMetricVariantProps
  variantMap: SurfaceMetricVariantMap
  variantKeys: Array<keyof SurfaceMetricVariant>
  splitVariantProps<Props extends SurfaceMetricVariantProps>(props: Props): [SurfaceMetricVariantProps, Pretty<DistributiveOmit<Props, keyof SurfaceMetricVariantProps>>]
  getVariantProps: (props?: SurfaceMetricVariantProps) => SurfaceMetricVariantProps
}


export declare const surfaceMetric: SurfaceMetricRecipe