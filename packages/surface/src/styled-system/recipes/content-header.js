import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const contentHeaderDefaultVariants = {}
const contentHeaderCompoundVariants = []

const contentHeaderSlotNames = [
  [
    "root",
    "content-header__root"
  ],
  [
    "breadcrumbs",
    "content-header__breadcrumbs"
  ],
  [
    "currentCrumb",
    "content-header__currentCrumb"
  ],
  [
    "row",
    "content-header__row"
  ],
  [
    "heading",
    "content-header__heading"
  ],
  [
    "eyebrow",
    "content-header__eyebrow"
  ],
  [
    "title",
    "content-header__title"
  ],
  [
    "description",
    "content-header__description"
  ],
  [
    "actions",
    "content-header__actions"
  ]
]
const contentHeaderSlotFns = /* @__PURE__ */ contentHeaderSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, contentHeaderDefaultVariants, getSlotCompoundVariant(contentHeaderCompoundVariants, slotName))])

const contentHeaderFn = memo((props = {}) => {
  return Object.fromEntries(contentHeaderSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const contentHeaderVariantKeys = []
const getVariantProps = (variants) => ({ ...contentHeaderDefaultVariants, ...compact(variants) })

export const contentHeader = /* @__PURE__ */ Object.assign(contentHeaderFn, {
  __recipe__: false,
  __name__: 'contentHeader',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: contentHeaderVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, contentHeaderVariantKeys)
  },
  getVariantProps
})