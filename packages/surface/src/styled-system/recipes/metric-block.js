import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const metricBlockDefaultVariants = {
  "trendTone": "neutral"
}
const metricBlockCompoundVariants = []

const metricBlockSlotNames = [
  [
    "root",
    "metric-block__root"
  ],
  [
    "header",
    "metric-block__header"
  ],
  [
    "label",
    "metric-block__label"
  ],
  [
    "icon",
    "metric-block__icon"
  ],
  [
    "skeleton",
    "metric-block__skeleton"
  ],
  [
    "value",
    "metric-block__value"
  ],
  [
    "meta",
    "metric-block__meta"
  ],
  [
    "trend",
    "metric-block__trend"
  ],
  [
    "detail",
    "metric-block__detail"
  ]
]
const metricBlockSlotFns = /* @__PURE__ */ metricBlockSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, metricBlockDefaultVariants, getSlotCompoundVariant(metricBlockCompoundVariants, slotName))])

const metricBlockFn = memo((props = {}) => {
  return Object.fromEntries(metricBlockSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const metricBlockVariantKeys = [
  "trendTone"
]
const getVariantProps = (variants) => ({ ...metricBlockDefaultVariants, ...compact(variants) })

export const metricBlock = /* @__PURE__ */ Object.assign(metricBlockFn, {
  __recipe__: false,
  __name__: 'metricBlock',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: metricBlockVariantKeys,
  variantMap: {
  "trendTone": [
    "positive",
    "negative",
    "warning",
    "neutral"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, metricBlockVariantKeys)
  },
  getVariantProps
})