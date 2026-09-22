import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productWorkspaceDefaultVariants = {
  "hasSecondary": false
}
const productWorkspaceCompoundVariants = []

const productWorkspaceSlotNames = [
  [
    "root",
    "product-workspace__root"
  ],
  [
    "summary",
    "product-workspace__summary"
  ],
  [
    "columns",
    "product-workspace__columns"
  ],
  [
    "primary",
    "product-workspace__primary"
  ],
  [
    "secondary",
    "product-workspace__secondary"
  ]
]
const productWorkspaceSlotFns = /* @__PURE__ */ productWorkspaceSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productWorkspaceDefaultVariants, getSlotCompoundVariant(productWorkspaceCompoundVariants, slotName))])

const productWorkspaceFn = memo((props = {}) => {
  return Object.fromEntries(productWorkspaceSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productWorkspaceVariantKeys = [
  "hasSecondary"
]
const getVariantProps = (variants) => ({ ...productWorkspaceDefaultVariants, ...compact(variants) })

export const productWorkspace = /* @__PURE__ */ Object.assign(productWorkspaceFn, {
  __recipe__: false,
  __name__: 'productWorkspace',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productWorkspaceVariantKeys,
  variantMap: {
  "hasSecondary": [
    "true",
    "false"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, productWorkspaceVariantKeys)
  },
  getVariantProps
})