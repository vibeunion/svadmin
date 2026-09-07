import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

function sourcesIn(directory) {
  return readdirSync(directory, { recursive: true })
    .filter((file) => /\.(?:svelte|[cm]?js|ts)$/.test(file))
    .filter((file) => !/(?:^|[./-])(?:test|spec|test-host)(?:[./-]|$)/i.test(file))
    .sort()
    .map((file) => ({
      content: readFileSync(join(directory, file), 'utf8'),
      extension: file.split('.').pop(),
    }));
}

export async function buildStyles() {
  const sourcePath = join(packageRoot, 'src/ai.css');
  const themeSource = readFileSync(join(packageRoot, 'src/ai-theme.css'), 'utf8');
  // Resolve the installed dependency instead of guessing hoisted node_modules paths.
  const streamdownRoot = dirname(fileURLToPath(import.meta.resolve('streamdown-svelte/plugins')));
  const scanner = new Scanner({});
  const candidates = scanner.scanFiles([
    ...sourcesIn(join(packageRoot, 'src')),
    ...sourcesIn(streamdownRoot),
  ]).sort();
  if (!candidates.includes('flex')) throw new Error('AI stylesheet source scanning produced no layout utilities');
  const compiler = await compile(readFileSync(sourcePath, 'utf8'), {
    base: dirname(sourcePath),
    from: sourcePath,
    onDependency() {},
  });
  const css = postcss.parse(compiler.build(candidates));
  css.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'layer' && rule.parent.params === 'theme') {
      if (rule.selector === ':root, :host') rule.selector = ':where(:root, :host)';
    }
  });
  const aliases = postcss.rule({ selector: ':where(:root, .svadmin-theme)' });
  postcss.parse(themeSource).walkAtRules('theme', (rule) => {
    rule.walkDecls((declaration) => aliases.append(declaration.clone()));
  });
  css.append(postcss.atRule({ name: 'layer', params: 'theme' }).append(aliases));
  const plain = `${css.toString().trim()}\n`;
  return { plain, theme: `${plain}\n${themeSource}\n`, candidates };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { plain, theme, candidates } = await buildStyles();
  writeFileSync(join(packageRoot, 'dist/ai.css'), plain);
  writeFileSync(join(packageRoot, 'dist/ai.theme.css'), theme);
  console.info(`[ai-static-css] compiled ${candidates.length} candidates into both CSS entries`);
}
