import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { retirePrimitiveFallbacks } from './retire-primitive-fallbacks.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = resolve(packageRoot, 'src');
const dist = resolve(packageRoot, 'dist');

function inlineCss(path, ancestors = new Set()) {
  if (ancestors.has(path)) throw new Error(`Circular CSS import: ${path}`);
  const stack = new Set([...ancestors, path]);
  const root = postcss.parse(readFileSync(path, 'utf8'), { from: path });
  root.walkAtRules('import', (rule) => {
    const match = /^['"](\.\.?\/[^'"]+\.css)['"]$/.exec(rule.params);
    if (!match) throw new Error(`Only local plain-CSS imports are allowed: ${rule.params}`);
    const target = resolve(dirname(path), match[1]);
    if (relative(sourceRoot, target).startsWith('..')) throw new Error('CSS import escapes the package source');
    rule.replaceWith(...inlineCss(target, stack).nodes);
  });
  root.walkAtRules((rule) => {
    if (['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind', 'reference', 'variant', 'config', 'plugin', 'screen', 'responsive', 'variants'].includes(rule.name)) {
      throw new Error(`Unexpected compiler directive @${rule.name}`);
    }
  });
  if (path === resolve(sourceRoot, 'components.css')) retirePrimitiveFallbacks(root);
  return root;
}

const css = `${inlineCss(resolve(sourceRoot, 'app.css')).toString().trim()}\n`;
const aliases = postcss.parse(readFileSync(resolve(sourceRoot, 'styles/aliases.css'), 'utf8'));
let hasPrimaryAlias = false;
aliases.walkDecls('--color-primary', () => { hasPrimaryAlias = true; });
if (!hasPrimaryAlias) throw new Error('Missing public theme aliases');
mkdirSync(dist, { recursive: true });
// 两个公开入口保持同一原生 CSS；旧路径兼容不再意味着保留编译器元数据。
writeFileSync(resolve(dist, 'app.css'), css);
writeFileSync(resolve(dist, 'app.theme.css'), css);
console.info('[build-static-css] published native CSS entries and pre-generated Panda recipes');
