/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface SurfaceTableVariant {
  /**
 * @default "comfortable"
 */
density: "comfortable" | "compact"
}

type SurfaceTableVariantMap = {
  [key in keyof SurfaceTableVariant]: Array<SurfaceTableVariant[key]>
}

type SurfaceTableSlot = "root" | "header" | "content" | "head" | "cell" | "state"

export type SurfaceTableVariantProps = {
  [key in keyof SurfaceTableVariant]?: ConditionalValue<SurfaceTableVariant[key]> | undefined
}

export interface SurfaceTableRecipe {
  __slot: SurfaceTableSlot
  __type: SurfaceTableVariantProps
  (props?: SurfaceTableVariantProps): Pretty<Record<SurfaceTableSlot, string>>
  raw: (props?: SurfaceTableVariantProps) => SurfaceTableVariantProps
  variantMap: SurfaceTableVariantMap
  variantKeys: Array<keyof SurfaceTableVariant>
  splitVariantProps<Props extends SurfaceTableVariantProps>(props: Props): [SurfaceTableVariantProps, Pretty<DistributiveOmit<Props, keyof SurfaceTableVariantProps>>]
  getVariantProps: (props?: SurfaceTableVariantProps) => SurfaceTableVariantProps
}


export declare const surfaceTable: SurfaceTableRecipe