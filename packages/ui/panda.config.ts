import { defineConfig } from '@pandacss/dev';
import { designTokens, semanticTokens } from './design/tokens.js';
import { surfaceMetric, surfaceTable } from './design/recipes.js';

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
  theme: { tokens: designTokens, semanticTokens, slotRecipes: { surfaceMetric, surfaceTable } },
  // AI 在运行时选择变体；不能依赖源码扫描碰巧发现这些值。
  staticCss: { recipes: { surfaceMetric: ['*'], surfaceTable: ['*'] } },
});
