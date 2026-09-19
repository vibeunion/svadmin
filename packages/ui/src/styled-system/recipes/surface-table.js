import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const surfaceTableDefaultVariants = {
  "density": "comfortable"
}
const surfaceTableCompoundVariants = []

const surfaceTableSlotNames = [
  [
    "root",
    "svadmin-panda-table__root"
  ],
  [
    "head",
    "svadmin-panda-table__head"
  ],
  [
    "row",
    "svadmin-panda-table__row"
  ],
  [
    "cell",
    "svadmin-panda-table__cell"
  ]
]
const surfaceTableSlotFns = /* @__PURE__ */ surfaceTableSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, surfaceTableDefaultVariants, getSlotCompoundVariant(surfaceTableCompoundVariants, slotName))])

const surfaceTableFn = memo((props = {}) => {
  return Object.fromEntries(surfaceTableSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const surfaceTableVariantKeys = [
  "density"
]
const getVariantProps = (variants) => ({ ...surfaceTableDefaultVariants, ...compact(variants) })

export const surfaceTable = /* @__PURE__ */ Object.assign(surfaceTableFn, {
  __recipe__: false,
  __name__: 'surfaceTable',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: surfaceTableVariantKeys,
  variantMap: {
  "density": [
    "comfortable",
    "compact"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, surfaceTableVariantKeys)
  },
  getVariantProps
})