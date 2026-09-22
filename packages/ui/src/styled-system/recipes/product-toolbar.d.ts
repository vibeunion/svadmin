/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductToolbarVariant {
  
}

type ProductToolbarVariantMap = {
  [key in keyof ProductToolbarVariant]: Array<ProductToolbarVariant[key]>
}

type ProductToolbarSlot = "root" | "leading" | "trailing"

export type ProductToolbarVariantProps = {
  [key in keyof ProductToolbarVariant]?: ConditionalValue<ProductToolbarVariant[key]> | undefined
}

export interface ProductToolbarRecipe {
  __slot: ProductToolbarSlot
  __type: ProductToolbarVariantProps
  (props?: ProductToolbarVariantProps): Pretty<Record<ProductToolbarSlot, string>>
  raw: (props?: ProductToolbarVariantProps) => ProductToolbarVariantProps
  variantMap: ProductToolbarVariantMap
  variantKeys: Array<keyof ProductToolbarVariant>
  splitVariantProps<Props extends ProductToolbarVariantProps>(props: Props): [ProductToolbarVariantProps, Pretty<DistributiveOmit<Props, keyof ProductToolbarVariantProps>>]
  getVariantProps: (props?: ProductToolbarVariantProps) => ProductToolbarVariantProps
}


export declare const productToolbar: ProductToolbarRecipe