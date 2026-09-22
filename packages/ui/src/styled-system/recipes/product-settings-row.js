import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productSettingsRowDefaultVariants = {
  "separated": false
}
const productSettingsRowCompoundVariants = []

const productSettingsRowSlotNames = [
  [
    "root",
    "product-settings-row__root"
  ],
  [
    "heading",
    "product-settings-row__heading"
  ],
  [
    "label",
    "product-settings-row__label"
  ],
  [
    "description",
    "product-settings-row__description"
  ],
  [
    "control",
    "product-settings-row__control"
  ]
]
const productSettingsRowSlotFns = /* @__PURE__ */ productSettingsRowSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productSettingsRowDefaultVariants, getSlotCompoundVariant(productSettingsRowCompoundVariants, slotName))])

const productSettingsRowFn = memo((props = {}) => {
  return Object.fromEntries(productSettingsRowSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productSettingsRowVariantKeys = [
  "separated"
]
const getVariantProps = (variants) => ({ ...productSettingsRowDefaultVariants, ...compact(variants) })

export const productSettingsRow = /* @__PURE__ */ Object.assign(productSettingsRowFn, {
  __recipe__: false,
  __name__: 'productSettingsRow',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productSettingsRowVariantKeys,
  variantMap: {
  "separated": [
    "true",
    "false"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, productSettingsRowVariantKeys)
  },
  getVariantProps
})