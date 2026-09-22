import { memo, splitProps } from '../helpers.js';
import { createRecipe, mergeRecipes } from './create-recipe.js';

const uiTextareaFn = /* @__PURE__ */ createRecipe('ui-textarea', {}, [])

const uiTextareaVariantMap = {}

const uiTextareaVariantKeys = Object.keys(uiTextareaVariantMap)

export const uiTextarea = /* @__PURE__ */ Object.assign(memo(uiTextareaFn.recipeFn), {
  __recipe__: true,
  __name__: 'uiTextarea',
  __getCompoundVariantCss__: uiTextareaFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: uiTextareaVariantKeys,
  variantMap: uiTextareaVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, uiTextareaVariantKeys)
  },
  getVariantProps: uiTextareaFn.getVariantProps,
})