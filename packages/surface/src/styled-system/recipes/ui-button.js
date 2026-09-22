import { memo, splitProps } from '../helpers.js';
import { createRecipe, mergeRecipes } from './create-recipe.js';

const uiButtonFn = /* @__PURE__ */ createRecipe('ui-button', {}, [])

const uiButtonVariantMap = {
  "variant": [
    "default",
    "outline",
    "secondary",
    "ghost",
    "destructive",
    "link"
  ],
  "size": [
    "default",
    "xs",
    "sm",
    "lg",
    "icon",
    "icon-xs",
    "icon-sm",
    "icon-lg"
  ]
}

const uiButtonVariantKeys = Object.keys(uiButtonVariantMap)

export const uiButton = /* @__PURE__ */ Object.assign(memo(uiButtonFn.recipeFn), {
  __recipe__: true,
  __name__: 'uiButton',
  __getCompoundVariantCss__: uiButtonFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: uiButtonVariantKeys,
  variantMap: uiButtonVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, uiButtonVariantKeys)
  },
  getVariantProps: uiButtonFn.getVariantProps,
})