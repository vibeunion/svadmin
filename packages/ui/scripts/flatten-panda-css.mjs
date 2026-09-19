import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

const root = postcss.parse(readFileSync(new URL('../src/styled-system/styles.css', import.meta.url), 'utf8'));
// 旧版组件包含无层样式。仅展开本库独立命名空间的 Panda 层，保持宿主可覆盖，
// 不通过 !important 或新增全局 reset 改变现有级联关系。
root.walkAtRules('layer', (rule) => {
  if (rule.nodes) rule.replaceWith(...rule.nodes);
  else rule.remove();
});
mkdirSync(new URL('../src/styles/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/styles/recipes.css', import.meta.url), `${root.toString().trim()}\n`);
