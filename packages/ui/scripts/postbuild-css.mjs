import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const distDir = new URL('../dist/', import.meta.url);
const themePath = fileURLToPath(new URL('app.theme.css', distDir));
const theme = postcss.parse(readFileSync(themePath, 'utf8'));
const aliases = postcss.rule({ selector: ':root,\n.svadmin-theme' });
theme.walkAtRules('theme', (rule) => {
  rule.walkDecls((declaration) => aliases.append(declaration.clone()));
});
if (!aliases.nodes.length) throw new Error('Missing semantic @theme declarations');

// Rebind aliases at nested theme roots instead of inheriting resolved root colors.
for (const name of ['app.css', 'app.theme.css']) {
  const path = fileURLToPath(new URL(name, distDir));
  const root = postcss.parse(readFileSync(path, 'utf8'));
  root.walkRules((rule) => {
    if (rule.selector === aliases.selector) rule.remove();
  });
  root.append(aliases.clone());
  writeFileSync(path, `${root.toString().trim()}\n`, 'utf8');
}
console.info('[postbuild-css] preserved semantic aliases in both CSS entry points');
