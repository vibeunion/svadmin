/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductStatusVariant {
  /**
 * @default "neutral"
 */
status: "success" | "warning" | "danger" | "info" | "neutral"
}

type ProductStatusVariantMap = {
  [key in keyof ProductStatusVariant]: Array<ProductStatusVariant[key]>
}

type ProductStatusSlot = "root"

export type ProductStatusVariantProps = {
  [key in keyof ProductStatusVariant]?: ConditionalValue<ProductStatusVariant[key]> | undefined
}

export interface ProductStatusRecipe {
  __slot: ProductStatusSlot
  __type: ProductStatusVariantProps
  (props?: ProductStatusVariantProps): Pretty<Record<ProductStatusSlot, string>>
  raw: (props?: ProductStatusVariantProps) => ProductStatusVariantProps
  variantMap: ProductStatusVariantMap
  variantKeys: Array<keyof ProductStatusVariant>
  splitVariantProps<Props extends ProductStatusVariantProps>(props: Props): [ProductStatusVariantProps, Pretty<DistributiveOmit<Props, keyof ProductStatusVariantProps>>]
  getVariantProps: (props?: ProductStatusVariantProps) => ProductStatusVariantProps
}


export declare const productStatus: ProductStatusRecipe