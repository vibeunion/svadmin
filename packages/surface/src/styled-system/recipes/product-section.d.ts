/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductSectionVariant {
  
}

type ProductSectionVariantMap = {
  [key in keyof ProductSectionVariant]: Array<ProductSectionVariant[key]>
}

type ProductSectionSlot = "root" | "heading" | "title" | "description" | "actions"

export type ProductSectionVariantProps = {
  [key in keyof ProductSectionVariant]?: ConditionalValue<ProductSectionVariant[key]> | undefined
}

export interface ProductSectionRecipe {
  __slot: ProductSectionSlot
  __type: ProductSectionVariantProps
  (props?: ProductSectionVariantProps): Pretty<Record<ProductSectionSlot, string>>
  raw: (props?: ProductSectionVariantProps) => ProductSectionVariantProps
  variantMap: ProductSectionVariantMap
  variantKeys: Array<keyof ProductSectionVariant>
  splitVariantProps<Props extends ProductSectionVariantProps>(props: Props): [ProductSectionVariantProps, Pretty<DistributiveOmit<Props, keyof ProductSectionVariantProps>>]
  getVariantProps: (props?: ProductSectionVariantProps) => ProductSectionVariantProps
}


export declare const productSection: ProductSectionRecipe