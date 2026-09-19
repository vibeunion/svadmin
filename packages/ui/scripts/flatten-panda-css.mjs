import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';
import { flattenPandaLayers } from './panda-css-layers.mjs';

const root = postcss.parse(readFileSync(new URL('../src/styled-system/styles.css', import.meta.url), 'utf8'));
// 只展开本库的预生成样式，保持声明顺序与 media 条件；不修改旧 CSS 基线。
flattenPandaLayers(root);
root.walkAtRules('layer', () => {
  throw new Error('Panda recipe layers were not completely flattened');
});
mkdirSync(new URL('../src/styles/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/styles/recipes.css', import.meta.url), `${root.toString().trim()}\n`);
