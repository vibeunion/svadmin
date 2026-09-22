import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const contentPageDefaultVariants = {
  "width": "default"
}
const contentPageCompoundVariants = []

const contentPageSlotNames = [
  [
    "root",
    "content-page__root"
  ]
]
const contentPageSlotFns = /* @__PURE__ */ contentPageSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, contentPageDefaultVariants, getSlotCompoundVariant(contentPageCompoundVariants, slotName))])

const contentPageFn = memo((props = {}) => {
  return Object.fromEntries(contentPageSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const contentPageVariantKeys = [
  "width"
]
const getVariantProps = (variants) => ({ ...contentPageDefaultVariants, ...compact(variants) })

export const contentPage = /* @__PURE__ */ Object.assign(contentPageFn, {
  __recipe__: false,
  __name__: 'contentPage',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: contentPageVariantKeys,
  variantMap: {
  "width": [
    "narrow",
    "default",
    "wide"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, contentPageVariantKeys)
  },
  getVariantProps
})