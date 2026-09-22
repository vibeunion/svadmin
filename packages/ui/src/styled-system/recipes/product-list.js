import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productListDefaultVariants = {}
const productListCompoundVariants = []

const productListSlotNames = [
  [
    "filters",
    "product-list__filters"
  ],
  [
    "filter",
    "product-list__filter"
  ],
  [
    "filterCount",
    "product-list__filterCount"
  ],
  [
    "table",
    "product-list__table"
  ],
  [
    "identity",
    "product-list__identity"
  ],
  [
    "avatar",
    "product-list__avatar"
  ],
  [
    "name",
    "product-list__name"
  ],
  [
    "secondary",
    "product-list__secondary"
  ],
  [
    "numeric",
    "product-list__numeric"
  ],
  [
    "footer",
    "product-list__footer"
  ],
  [
    "help",
    "product-list__help"
  ]
]
const productListSlotFns = /* @__PURE__ */ productListSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productListDefaultVariants, getSlotCompoundVariant(productListCompoundVariants, slotName))])

const productListFn = memo((props = {}) => {
  return Object.fromEntries(productListSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productListVariantKeys = []
const getVariantProps = (variants) => ({ ...productListDefaultVariants, ...compact(variants) })

export const productList = /* @__PURE__ */ Object.assign(productListFn, {
  __recipe__: false,
  __name__: 'productList',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productListVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, productListVariantKeys)
  },
  getVariantProps
})