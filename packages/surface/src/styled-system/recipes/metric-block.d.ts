/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface MetricBlockVariant {
  /**
 * @default "neutral"
 */
trendTone: "positive" | "negative" | "warning" | "neutral"
}

type MetricBlockVariantMap = {
  [key in keyof MetricBlockVariant]: Array<MetricBlockVariant[key]>
}

type MetricBlockSlot = "root" | "header" | "label" | "icon" | "skeleton" | "value" | "meta" | "trend" | "detail"

export type MetricBlockVariantProps = {
  [key in keyof MetricBlockVariant]?: ConditionalValue<MetricBlockVariant[key]> | undefined
}

export interface MetricBlockRecipe {
  __slot: MetricBlockSlot
  __type: MetricBlockVariantProps
  (props?: MetricBlockVariantProps): Pretty<Record<MetricBlockSlot, string>>
  raw: (props?: MetricBlockVariantProps) => MetricBlockVariantProps
  variantMap: MetricBlockVariantMap
  variantKeys: Array<keyof MetricBlockVariant>
  splitVariantProps<Props extends MetricBlockVariantProps>(props: Props): [MetricBlockVariantProps, Pretty<DistributiveOmit<Props, keyof MetricBlockVariantProps>>]
  getVariantProps: (props?: MetricBlockVariantProps) => MetricBlockVariantProps
}


export declare const metricBlock: MetricBlockRecipe