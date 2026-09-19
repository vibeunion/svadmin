import { defineConfig } from '@pandacss/dev';
import { designTokens, semanticTokens } from './design/tokens.js';
import { surfaceMetric, surfaceTable } from './design/recipes.js';
import { productSection, productToolbar, productWorkspace, productSettings, productSettingsRow, productList } from './design/product-recipes.js';
import { uiButton, uiBadge, uiInput, uiTextarea } from './design/primitive-recipes.js';

export default defineConfig({
  preflight: false,
  presets: [],
  prefix: 'svadmin',
  // 主题变量必须在嵌套主题根重新绑定，不能继承已经解析的根节点颜色。
  cssVarRoot: ':where(:root, :host, .svadmin-theme, .dark, [data-theme])',
  include: ['./src/**/*.{ts,svelte}'],
  exclude: ['./src/**/*.test.*', './src/styled-system/**'],
  outdir: 'src/styled-system',
  outExtension: 'js',
  theme: {
    tokens: designTokens,
    semanticTokens,
    recipes: { uiButton, uiBadge, uiTextarea },
    slotRecipes: { surfaceMetric, surfaceTable, uiInput, productSection, productToolbar, productWorkspace, productSettings, productSettingsRow, productList },
  },
  // AI 与普通调用方在运行时选择变体；不能依赖扫描碰巧发现这些值。
  staticCss: { recipes: {
    surfaceMetric: ['*'], surfaceTable: ['*'],
    uiButton: ['*'], uiBadge: ['*'], uiInput: ['*'], uiTextarea: ['*'],
    productSection: ['*'], productToolbar: ['*'], productWorkspace: ['*'], productSettings: ['*'], productSettingsRow: ['*'], productList: ['*'],
  } },
});
