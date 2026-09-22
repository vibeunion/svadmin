import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productStatusDefaultVariants = {
  "status": "neutral"
}
const productStatusCompoundVariants = []

const productStatusSlotNames = [
  [
    "root",
    "product-status__root"
  ]
]
const productStatusSlotFns = /* @__PURE__ */ productStatusSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productStatusDefaultVariants, getSlotCompoundVariant(productStatusCompoundVariants, slotName))])

const productStatusFn = memo((props = {}) => {
  return Object.fromEntries(productStatusSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productStatusVariantKeys = [
  "status"
]
const getVariantProps = (variants) => ({ ...productStatusDefaultVariants, ...compact(variants) })

export const productStatus = /* @__PURE__ */ Object.assign(productStatusFn, {
  __recipe__: false,
  __name__: 'productStatus',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productStatusVariantKeys,
  variantMap: {
  "status": [
    "success",
    "warning",
    "danger",
    "info",
    "neutral"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, productStatusVariantKeys)
  },
  getVariantProps
})