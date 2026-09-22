/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductListVariant {
  
}

type ProductListVariantMap = {
  [key in keyof ProductListVariant]: Array<ProductListVariant[key]>
}

type ProductListSlot = "filters" | "filter" | "filterCount" | "table" | "identity" | "avatar" | "name" | "secondary" | "numeric" | "footer" | "help"

export type ProductListVariantProps = {
  [key in keyof ProductListVariant]?: ConditionalValue<ProductListVariant[key]> | undefined
}

export interface ProductListRecipe {
  __slot: ProductListSlot
  __type: ProductListVariantProps
  (props?: ProductListVariantProps): Pretty<Record<ProductListSlot, string>>
  raw: (props?: ProductListVariantProps) => ProductListVariantProps
  variantMap: ProductListVariantMap
  variantKeys: Array<keyof ProductListVariant>
  splitVariantProps<Props extends ProductListVariantProps>(props: Props): [ProductListVariantProps, Pretty<DistributiveOmit<Props, keyof ProductListVariantProps>>]
  getVariantProps: (props?: ProductListVariantProps) => ProductListVariantProps
}


export declare const productList: ProductListRecipe