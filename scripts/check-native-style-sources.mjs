import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const targets = {
  ui: ['packages/ui/src', 'packages/ui/src/styles/compatibility.prelude.css'],
  'ai-elements': ['packages/ai-elements/src', 'packages/ai-elements/src/utilities.css'],
  example: ['example/src', 'example/styles/compatibility.css'],
};

// 这些已审查的兼容 CSS 是原生源码，不再经由废弃的编译器重新生成。
for (const name of process.argv.slice(2)) {
  assert.ok(Object.hasOwn(targets, name), `Unknown native stylesheet target: ${name}`);
  const [source, stylesheet] = targets[name].map(path => resolve(root, path));
  const classes = new Set();
  const css = postcss.parse(readFileSync(stylesheet, 'utf8'));
  css.walkAtRules(rule => assert.ok(!['theme', 'source', 'apply', 'tailwind', 'utility'].includes(rule.name), `${name}: compiler directive @${rule.name}`));
  css.walkRules(rule => {
    selectorParser(ast => ast.walkClasses(node => classes.add(node.value))).processSync(rule.selector);
  });
  const missing = new Set();
  for (const file of readdirSync(source, { recursive: true })) {
    if (!file.endsWith('.svelte')) continue;
    for (const [alias] of readFileSync(resolve(source, file), 'utf8').matchAll(/svadmin-u-[a-f0-9]{12}/gu)) {
      if (!classes.has(alias)) missing.add(alias);
    }
  }
  assert.deepEqual([...missing], [], `${name}: missing native compatibility selectors`);
  console.info(`[native-styles] ${name}: ${classes.size} selectors; component aliases covered`);
}
