/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface UiButtonVariant {
  variant: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
size: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
}

type UiButtonVariantMap = {
  [key in keyof UiButtonVariant]: Array<UiButtonVariant[key]>
}



export type UiButtonVariantProps = {
  [key in keyof UiButtonVariant]?: ConditionalValue<UiButtonVariant[key]> | undefined
}

export interface UiButtonRecipe {
  
  __type: UiButtonVariantProps
  (props?: UiButtonVariantProps): string
  raw: (props?: UiButtonVariantProps) => UiButtonVariantProps
  variantMap: UiButtonVariantMap
  variantKeys: Array<keyof UiButtonVariant>
  splitVariantProps<Props extends UiButtonVariantProps>(props: Props): [UiButtonVariantProps, Pretty<DistributiveOmit<Props, keyof UiButtonVariantProps>>]
  getVariantProps: (props?: UiButtonVariantProps) => UiButtonVariantProps
}


export declare const uiButton: UiButtonRecipe