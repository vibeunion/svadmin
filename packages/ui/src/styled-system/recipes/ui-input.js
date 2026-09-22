import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const uiInputDefaultVariants = {}
const uiInputCompoundVariants = []

const uiInputSlotNames = [
  [
    "root",
    "ui-input__root"
  ],
  [
    "control",
    "ui-input__control"
  ],
  [
    "visual",
    "ui-input__visual"
  ],
  [
    "button",
    "ui-input__button"
  ],
  [
    "name",
    "ui-input__name"
  ]
]
const uiInputSlotFns = /* @__PURE__ */ uiInputSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, uiInputDefaultVariants, getSlotCompoundVariant(uiInputCompoundVariants, slotName))])

const uiInputFn = memo((props = {}) => {
  return Object.fromEntries(uiInputSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const uiInputVariantKeys = []
const getVariantProps = (variants) => ({ ...uiInputDefaultVariants, ...compact(variants) })

export const uiInput = /* @__PURE__ */ Object.assign(uiInputFn, {
  __recipe__: false,
  __name__: 'uiInput',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: uiInputVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, uiInputVariantKeys)
  },
  getVariantProps
})