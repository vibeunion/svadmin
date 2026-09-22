/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface UiBadgeVariant {
  variant: "default" | "secondary" | "destructive" | "subtle" | "subtle-success" | "subtle-warning" | "subtle-destructive" | "subtle-pill" | "outline" | "ghost" | "link"
}

type UiBadgeVariantMap = {
  [key in keyof UiBadgeVariant]: Array<UiBadgeVariant[key]>
}



export type UiBadgeVariantProps = {
  [key in keyof UiBadgeVariant]?: ConditionalValue<UiBadgeVariant[key]> | undefined
}

export interface UiBadgeRecipe {
  
  __type: UiBadgeVariantProps
  (props?: UiBadgeVariantProps): string
  raw: (props?: UiBadgeVariantProps) => UiBadgeVariantProps
  variantMap: UiBadgeVariantMap
  variantKeys: Array<keyof UiBadgeVariant>
  splitVariantProps<Props extends UiBadgeVariantProps>(props: Props): [UiBadgeVariantProps, Pretty<DistributiveOmit<Props, keyof UiBadgeVariantProps>>]
  getVariantProps: (props?: UiBadgeVariantProps) => UiBadgeVariantProps
}


export declare const uiBadge: UiBadgeRecipe