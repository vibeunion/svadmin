import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const productSettingsDefaultVariants = {}
const productSettingsCompoundVariants = []

const productSettingsSlotNames = [
  [
    "root",
    "product-settings__root"
  ],
  [
    "header",
    "product-settings__header"
  ],
  [
    "heading",
    "product-settings__heading"
  ],
  [
    "title",
    "product-settings__title"
  ],
  [
    "description",
    "product-settings__description"
  ],
  [
    "actions",
    "product-settings__actions"
  ],
  [
    "body",
    "product-settings__body"
  ]
]
const productSettingsSlotFns = /* @__PURE__ */ productSettingsSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, productSettingsDefaultVariants, getSlotCompoundVariant(productSettingsCompoundVariants, slotName))])

const productSettingsFn = memo((props = {}) => {
  return Object.fromEntries(productSettingsSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const productSettingsVariantKeys = []
const getVariantProps = (variants) => ({ ...productSettingsDefaultVariants, ...compact(variants) })

export const productSettings = /* @__PURE__ */ Object.assign(productSettingsFn, {
  __recipe__: false,
  __name__: 'productSettings',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: productSettingsVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, productSettingsVariantKeys)
  },
  getVariantProps
})