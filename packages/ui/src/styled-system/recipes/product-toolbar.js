import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productToolbarDefaultVariants = {}
const productToolbarCompoundVariants = []

const productToolbarSlotNames = [
  [
    "root",
    "product-toolbar__root"
  ],
  [
    "leading",
    "product-toolbar__leading"
  ],
  [
    "trailing",
    "product-toolbar__trailing"
  ]
]
const productToolbarSlotFns = /* @__PURE__ */ productToolbarSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productToolbarDefaultVariants, getSlotCompoundVariant(productToolbarCompoundVariants, slotName))])

const productToolbarFn = memo((props = {}) => {
  return Object.fromEntries(productToolbarSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productToolbarVariantKeys = []
const getVariantProps = (variants) => ({ ...productToolbarDefaultVariants, ...compact(variants) })

export const productToolbar = /* @__PURE__ */ Object.assign(productToolbarFn, {
  __recipe__: false,
  __name__: 'productToolbar',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productToolbarVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, productToolbarVariantKeys)
  },
  getVariantProps
})