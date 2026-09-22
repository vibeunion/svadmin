import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const fieldDefaultVariants = {
  "state": "default"
}
const fieldCompoundVariants = []

const fieldSlotNames = [
  [
    "root",
    "svadmin-panda-field__root"
  ],
  [
    "label",
    "svadmin-panda-field__label"
  ],
  [
    "description",
    "svadmin-panda-field__description"
  ],
  [
    "control",
    "svadmin-panda-field__control"
  ],
  [
    "message",
    "svadmin-panda-field__message"
  ]
]
const fieldSlotFns = /* @__PURE__ */ fieldSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, fieldDefaultVariants, getSlotCompoundVariant(fieldCompoundVariants, slotName))])

const fieldFn = memo((props = {}) => {
  return Object.fromEntries(fieldSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const fieldVariantKeys = [
  "state"
]
const getVariantProps = (variants) => ({ ...fieldDefaultVariants, ...compact(variants) })

export const field = /* @__PURE__ */ Object.assign(fieldFn, {
  __recipe__: false,
  __name__: 'field',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: fieldVariantKeys,
  variantMap: {
  "state": [
    "default",
    "error",
    "success",
    "disabled"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, fieldVariantKeys)
  },
  getVariantProps
})