import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const surfaceMetricDefaultVariants = {
  "tone": "neutral",
  "density": "comfortable"
}
const surfaceMetricCompoundVariants = []

const surfaceMetricSlotNames = [
  [
    "root",
    "surface-metric__root"
  ],
  [
    "card",
    "surface-metric__card"
  ],
  [
    "description",
    "surface-metric__description"
  ],
  [
    "state",
    "surface-metric__state"
  ]
]
const surfaceMetricSlotFns = /* @__PURE__ */ surfaceMetricSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, surfaceMetricDefaultVariants, getSlotCompoundVariant(surfaceMetricCompoundVariants, slotName))])

const surfaceMetricFn = memo((props = {}) => {
  return Object.fromEntries(surfaceMetricSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const surfaceMetricVariantKeys = [
  "tone",
  "density"
]
const getVariantProps = (variants) => ({ ...surfaceMetricDefaultVariants, ...compact(variants) })

export const surfaceMetric = /* @__PURE__ */ Object.assign(surfaceMetricFn, {
  __recipe__: false,
  __name__: 'surfaceMetric',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: surfaceMetricVariantKeys,
  variantMap: {
  "tone": [
    "neutral",
    "success",
    "warning",
    "danger",
    "info"
  ],
  "density": [
    "comfortable",
    "compact"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, surfaceMetricVariantKeys)
  },
  getVariantProps
})