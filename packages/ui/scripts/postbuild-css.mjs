import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const distDir = new URL('../dist/', import.meta.url);
// The native mapping is the source of truth; neither public entry needs a compiler.
const source = postcss.parse(readFileSync(new URL('../src/styles/aliases.css', import.meta.url), 'utf8'));
const aliases = postcss.rule({ selector: ':root,\n.svadmin-theme' });
source.walkAtRules((rule) => {
  throw new Error(`Unexpected directive in native semantic aliases: @${rule.name}`);
});
source.walkDecls((declaration) => {
  const owner = declaration.parent;
  if (owner?.type !== 'rule' || owner.parent !== source ||
      !owner.selectors.every((selector) => [':root', '.svadmin-theme'].includes(selector)) ||
      !declaration.prop.startsWith('--')) {
    throw new Error('Native semantic aliases must be custom properties at theme roots');
  }
  aliases.append(declaration.clone());
});
if (!aliases.nodes?.some((node) => node.prop === '--color-primary')) {
  throw new Error('Missing native semantic --color-primary alias');
}

// Rebind at nested theme roots instead of inheriting resolved root colors.
// Remove only our exact, unlayered mapping; never touch the frozen reset layers.
for (const name of ['app.css', 'app.theme.css']) {
  const path = fileURLToPath(new URL(name, distDir));
  const root = postcss.parse(readFileSync(path, 'utf8'));
  root.walkRules((rule) => {
    if (rule.parent === root && rule.selectors.length === 2 &&
        rule.selectors.includes(':root') && rule.selectors.includes('.svadmin-theme')) rule.remove();
  });
  root.append(aliases.clone());
  writeFileSync(path, `${root.toString().trim()}\n`, 'utf8');
}
console.info('[postbuild-css] preserved native semantic aliases in both CSS entry points');
