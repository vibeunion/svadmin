/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ContentPageVariant {
  /**
 * @default "default"
 */
width: "narrow" | "default" | "wide"
}

type ContentPageVariantMap = {
  [key in keyof ContentPageVariant]: Array<ContentPageVariant[key]>
}

type ContentPageSlot = "root"

export type ContentPageVariantProps = {
  [key in keyof ContentPageVariant]?: ConditionalValue<ContentPageVariant[key]> | undefined
}

export interface ContentPageRecipe {
  __slot: ContentPageSlot
  __type: ContentPageVariantProps
  (props?: ContentPageVariantProps): Pretty<Record<ContentPageSlot, string>>
  raw: (props?: ContentPageVariantProps) => ContentPageVariantProps
  variantMap: ContentPageVariantMap
  variantKeys: Array<keyof ContentPageVariant>
  splitVariantProps<Props extends ContentPageVariantProps>(props: Props): [ContentPageVariantProps, Pretty<DistributiveOmit<Props, keyof ContentPageVariantProps>>]
  getVariantProps: (props?: ContentPageVariantProps) => ContentPageVariantProps
}


export declare const contentPage: ContentPageRecipe