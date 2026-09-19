import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const distDir = new URL('../dist/', import.meta.url);
const source = postcss.parse(readFileSync(new URL('../src/styles/aliases.css', import.meta.url), 'utf8'));
const aliases = postcss.rule({ selector: ':root,\n.svadmin-theme' });
source.walkDecls((declaration) => aliases.append(declaration.clone()));
if (!aliases.nodes.length) throw new Error('Missing native semantic theme aliases');

// 嵌套主题必须重新绑定变量，不能继承根节点已经求值的颜色。
// 两个公开入口保持同样的纯 CSS 内容；不再读取或创建 @theme。
for (const name of ['app.css', 'app.theme.css']) {
  const path = fileURLToPath(new URL(name, distDir));
  const root = postcss.parse(readFileSync(path, 'utf8'));
  root.walkRules((rule) => {
    if (rule.selector === aliases.selector) rule.remove();
  });
  root.append(aliases.clone());
  writeFileSync(path, `${root.toString().trim()}\n`, 'utf8');
}
console.info('[postbuild-css] preserved native theme aliases in both CSS entry points');
