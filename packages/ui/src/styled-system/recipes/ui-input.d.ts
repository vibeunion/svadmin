/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface UiInputVariant {
  
}

type UiInputVariantMap = {
  [key in keyof UiInputVariant]: Array<UiInputVariant[key]>
}

type UiInputSlot = "root" | "control" | "visual" | "button" | "name"

export type UiInputVariantProps = {
  [key in keyof UiInputVariant]?: ConditionalValue<UiInputVariant[key]> | undefined
}

export interface UiInputRecipe {
  __slot: UiInputSlot
  __type: UiInputVariantProps
  (props?: UiInputVariantProps): Pretty<Record<UiInputSlot, string>>
  raw: (props?: UiInputVariantProps) => UiInputVariantProps
  variantMap: UiInputVariantMap
  variantKeys: Array<keyof UiInputVariant>
  splitVariantProps<Props extends UiInputVariantProps>(props: Props): [UiInputVariantProps, Pretty<DistributiveOmit<Props, keyof UiInputVariantProps>>]
  getVariantProps: (props?: UiInputVariantProps) => UiInputVariantProps
}


export declare const uiInput: UiInputRecipe