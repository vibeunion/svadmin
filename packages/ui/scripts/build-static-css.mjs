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
    if (['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind'].includes(rule.name)) {
      throw new Error(`Unexpected compiler directive @${rule.name}`);
    }
  });
  return root;
}

const css = inlineCss(resolve(sourceRoot, 'app.css')).toString();
const aliases = postcss.parse(readFileSync(resolve(sourceRoot, 'styles/aliases.css'), 'utf8'));
const metadata = postcss.atRule({ name: 'theme' });
aliases.walkDecls((decl) => metadata.append(decl.clone()));
if (!metadata.nodes?.length) throw new Error('Missing public theme aliases');
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'app.css'), `${css.trim()}\n`);
// 仅此兼容入口保留旧宿主的主题元数据；本库自身不安装或运行旧编译器。
writeFileSync(resolve(dist, 'app.theme.css'), `${css.trim()}\n${metadata.toString()}\n@source "./components";\n`);
console.info('[build-static-css] published native compatibility CSS and pre-generated Panda recipes');
