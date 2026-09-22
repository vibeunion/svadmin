/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface ProductWorkspaceVariant {
  /**
 * @default false
 */
hasSecondary: boolean
}

type ProductWorkspaceVariantMap = {
  [key in keyof ProductWorkspaceVariant]: Array<ProductWorkspaceVariant[key]>
}

type ProductWorkspaceSlot = "root" | "summary" | "columns" | "primary" | "secondary"

export type ProductWorkspaceVariantProps = {
  [key in keyof ProductWorkspaceVariant]?: ConditionalValue<ProductWorkspaceVariant[key]> | undefined
}

export interface ProductWorkspaceRecipe {
  __slot: ProductWorkspaceSlot
  __type: ProductWorkspaceVariantProps
  (props?: ProductWorkspaceVariantProps): Pretty<Record<ProductWorkspaceSlot, string>>
  raw: (props?: ProductWorkspaceVariantProps) => ProductWorkspaceVariantProps
  variantMap: ProductWorkspaceVariantMap
  variantKeys: Array<keyof ProductWorkspaceVariant>
  splitVariantProps<Props extends ProductWorkspaceVariantProps>(props: Props): [ProductWorkspaceVariantProps, Pretty<DistributiveOmit<Props, keyof ProductWorkspaceVariantProps>>]
  getVariantProps: (props?: ProductWorkspaceVariantProps) => ProductWorkspaceVariantProps
}


export declare const productWorkspace: ProductWorkspaceRecipe