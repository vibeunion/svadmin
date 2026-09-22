/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductSettingsVariant {
  
}

type ProductSettingsVariantMap = {
  [key in keyof ProductSettingsVariant]: Array<ProductSettingsVariant[key]>
}

type ProductSettingsSlot = "root" | "header" | "heading" | "title" | "description" | "actions" | "body"

export type ProductSettingsVariantProps = {
  [key in keyof ProductSettingsVariant]?: ConditionalValue<ProductSettingsVariant[key]> | undefined
}

export interface ProductSettingsRecipe {
  __slot: ProductSettingsSlot
  __type: ProductSettingsVariantProps
  (props?: ProductSettingsVariantProps): Pretty<Record<ProductSettingsSlot, string>>
  raw: (props?: ProductSettingsVariantProps) => ProductSettingsVariantProps
  variantMap: ProductSettingsVariantMap
  variantKeys: Array<keyof ProductSettingsVariant>
  splitVariantProps<Props extends ProductSettingsVariantProps>(props: Props): [ProductSettingsVariantProps, Pretty<DistributiveOmit<Props, keyof ProductSettingsVariantProps>>]
  getVariantProps: (props?: ProductSettingsVariantProps) => ProductSettingsVariantProps
}


export declare const productSettings: ProductSettingsRecipe