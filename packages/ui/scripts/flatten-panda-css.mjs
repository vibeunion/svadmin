import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';
import { flattenPandaLayers } from './panda-css-layers.mjs';
import { isolatePandaCss } from './panda-css-isolation.mjs';
import { layerPrimitiveRecipes } from './primitive-css-layers.mjs';

const root = postcss.parse(readFileSync(new URL('../src/styled-system/styles.css', import.meta.url), 'utf8'));
// Surface 增强规则保持非分层；基础组件保留原来的 components 层和消费端覆盖优先级。
flattenPandaLayers(root);
isolatePandaCss(root);
root.walkAtRules('layer', () => {
  throw new Error('Panda recipe layers were not completely flattened');
});
layerPrimitiveRecipes(root);
mkdirSync(new URL('../src/styles/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/styles/recipes.css', import.meta.url), `${root.toString().trim()}\n`);
