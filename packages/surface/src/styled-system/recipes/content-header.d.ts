/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ContentHeaderVariant {
  
}

type ContentHeaderVariantMap = {
  [key in keyof ContentHeaderVariant]: Array<ContentHeaderVariant[key]>
}

type ContentHeaderSlot = "root" | "breadcrumbs" | "currentCrumb" | "row" | "heading" | "eyebrow" | "title" | "description" | "actions"

export type ContentHeaderVariantProps = {
  [key in keyof ContentHeaderVariant]?: ConditionalValue<ContentHeaderVariant[key]> | undefined
}

export interface ContentHeaderRecipe {
  __slot: ContentHeaderSlot
  __type: ContentHeaderVariantProps
  (props?: ContentHeaderVariantProps): Pretty<Record<ContentHeaderSlot, string>>
  raw: (props?: ContentHeaderVariantProps) => ContentHeaderVariantProps
  variantMap: ContentHeaderVariantMap
  variantKeys: Array<keyof ContentHeaderVariant>
  splitVariantProps<Props extends ContentHeaderVariantProps>(props: Props): [ContentHeaderVariantProps, Pretty<DistributiveOmit<Props, keyof ContentHeaderVariantProps>>]
  getVariantProps: (props?: ContentHeaderVariantProps) => ContentHeaderVariantProps
}


export declare const contentHeader: ContentHeaderRecipe