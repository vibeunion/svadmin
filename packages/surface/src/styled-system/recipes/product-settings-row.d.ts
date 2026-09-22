/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductSettingsRowVariant {
  /**
 * @default false
 */
separated: boolean
}

type ProductSettingsRowVariantMap = {
  [key in keyof ProductSettingsRowVariant]: Array<ProductSettingsRowVariant[key]>
}

type ProductSettingsRowSlot = "root" | "heading" | "label" | "description" | "control"

export type ProductSettingsRowVariantProps = {
  [key in keyof ProductSettingsRowVariant]?: ConditionalValue<ProductSettingsRowVariant[key]> | undefined
}

export interface ProductSettingsRowRecipe {
  __slot: ProductSettingsRowSlot
  __type: ProductSettingsRowVariantProps
  (props?: ProductSettingsRowVariantProps): Pretty<Record<ProductSettingsRowSlot, string>>
  raw: (props?: ProductSettingsRowVariantProps) => ProductSettingsRowVariantProps
  variantMap: ProductSettingsRowVariantMap
  variantKeys: Array<keyof ProductSettingsRowVariant>
  splitVariantProps<Props extends ProductSettingsRowVariantProps>(props: Props): [ProductSettingsRowVariantProps, Pretty<DistributiveOmit<Props, keyof ProductSettingsRowVariantProps>>]
  getVariantProps: (props?: ProductSettingsRowVariantProps) => ProductSettingsRowVariantProps
}


export declare const productSettingsRow: ProductSettingsRowRecipe