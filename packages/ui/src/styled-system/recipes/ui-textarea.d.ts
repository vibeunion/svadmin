/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface UiTextareaVariant {
  
}

type UiTextareaVariantMap = {
  [key in keyof UiTextareaVariant]: Array<UiTextareaVariant[key]>
}



export type UiTextareaVariantProps = {
  [key in keyof UiTextareaVariant]?: ConditionalValue<UiTextareaVariant[key]> | undefined
}

export interface UiTextareaRecipe {
  
  __type: UiTextareaVariantProps
  (props?: UiTextareaVariantProps): string
  raw: (props?: UiTextareaVariantProps) => UiTextareaVariantProps
  variantMap: UiTextareaVariantMap
  variantKeys: Array<keyof UiTextareaVariant>
  splitVariantProps<Props extends UiTextareaVariantProps>(props: Props): [UiTextareaVariantProps, Pretty<DistributiveOmit<Props, keyof UiTextareaVariantProps>>]
  getVariantProps: (props?: UiTextareaVariantProps) => UiTextareaVariantProps
}


export declare const uiTextarea: UiTextareaRecipe