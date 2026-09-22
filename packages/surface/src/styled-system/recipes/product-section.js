import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productSectionDefaultVariants = {}
const productSectionCompoundVariants = []

const productSectionSlotNames = [
  [
    "root",
    "product-section__root"
  ],
  [
    "heading",
    "product-section__heading"
  ],
  [
    "title",
    "product-section__title"
  ],
  [
    "description",
    "product-section__description"
  ],
  [
    "actions",
    "product-section__actions"
  ]
]
const productSectionSlotFns = /* @__PURE__ */ productSectionSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productSectionDefaultVariants, getSlotCompoundVariant(productSectionCompoundVariants, slotName))])

const productSectionFn = memo((props = {}) => {
  return Object.fromEntries(productSectionSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productSectionVariantKeys = []
const getVariantProps = (variants) => ({ ...productSectionDefaultVariants, ...compact(variants) })

export const productSection = /* @__PURE__ */ Object.assign(productSectionFn, {
  __recipe__: false,
  __name__: 'productSection',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productSectionVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, productSectionVariantKeys)
  },
  getVariantProps
})