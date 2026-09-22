import { memo, splitProps } from '../helpers.js';
import { createRecipe, mergeRecipes } from './create-recipe.js';

const uiBadgeFn = /* @__PURE__ */ createRecipe('ui-badge', {}, [])

const uiBadgeVariantMap = {
  "variant": [
    "default",
    "secondary",
    "destructive",
    "subtle",
    "subtle-success",
    "subtle-warning",
    "subtle-destructive",
    "subtle-pill",
    "outline",
    "ghost",
    "link"
  ]
}

const uiBadgeVariantKeys = Object.keys(uiBadgeVariantMap)

export const uiBadge = /* @__PURE__ */ Object.assign(memo(uiBadgeFn.recipeFn), {
  __recipe__: true,
  __name__: 'uiBadge',
  __getCompoundVariantCss__: uiBadgeFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: uiBadgeVariantKeys,
  variantMap: uiBadgeVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, uiBadgeVariantKeys)
  },
  getVariantProps: uiBadgeFn.getVariantProps,
})