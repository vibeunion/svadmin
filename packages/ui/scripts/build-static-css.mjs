import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

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
    if (['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind', 'plugin', 'config'].includes(rule.name)) {
      throw new Error(`Unexpected compiler directive @${rule.name}`);
    }
  });
  return root;
}

const css = `${inlineCss(resolve(sourceRoot, 'app.css')).toString().trim()}\n`;
const aliases = postcss.parse(readFileSync(resolve(sourceRoot, 'styles/aliases.css'), 'utf8'));
let hasPrimaryAlias = false;
aliases.walkDecls('--color-primary', () => { hasPrimaryAlias = true; });
if (!hasPrimaryAlias) throw new Error('Missing public theme aliases');
mkdirSync(dist, { recursive: true });
// 保留旧入口路径，但两个入口都只发布浏览器可直接执行的 CSS。
// 主题变量仍由 styles/aliases.css 提供，不再向宿主注入编译器元数据。
for (const name of ['app.css', 'app.theme.css']) writeFileSync(resolve(dist, name), css);
console.info('[build-static-css] published compiler-free CSS through both public entry points');
