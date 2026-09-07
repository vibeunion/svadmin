import { compile } from '@tailwindcss/node';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(packageRoot, 'src');
const cssPath = join(sourceRoot, 'app.css');
const distDir = join(packageRoot, 'dist');
const outputPath = join(distDir, 'app.css');
const themeOutputPath = join(distDir, 'app.theme.css');
const utilityMapPath = join(packageRoot, 'scripts', 'utility-class-map.json');

function collectFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...collectFiles(path));
    else if (path.endsWith('.svelte') || path.endsWith('.ts')) files.push(path);
  }
  return files;
}

const candidates = new Set();
for (const file of collectFiles(sourceRoot)) {
  const source = readFileSync(file, 'utf8');
  const strings = [
    ...source.matchAll(/(?:class|className)\s*=\s*["'`]([^"'`]+)["'`]/g),
    ...source.matchAll(/['"`]([^'"`\r\n]+)['"`]/g),
  ];
  for (const match of strings) {
    for (const candidate of match[1].split(/\s+/u)) {
      const normalized = candidate.replace(/^[{(]+|[})]+$/g, '');
      if (normalized && !/[{}$]/u.test(normalized)) candidates.add(normalized);
    }
  }
}

const sourceCss = readFileSync(cssPath, 'utf8');
const utilityMap = existsSync(utilityMapPath)
  ? JSON.parse(readFileSync(utilityMapPath, 'utf8'))
  : {};
const legacyCandidates = Object.keys(utilityMap);
const compiler = await compile(sourceCss, {
  base: sourceRoot,
  from: cssPath,
  onDependency: () => {},
});
mkdirSync(distDir, { recursive: true });
let compiledCss = compiler.build([...candidates, ...legacyCandidates]);

if (legacyCandidates.length) {
  const renameSelectors = selectorParser((selectors) => {
    selectors.walkClasses((classNode) => {
      const alias = utilityMap[classNode.value];
      if (alias) classNode.value = alias;
    });
  });
  const root = postcss.parse(compiledCss);
  root.walkRules((rule) => {
    rule.selector = renameSelectors.processSync(rule.selector);
    // Precompiled defaults must not override a Tailwind host's own @theme.
    if (rule.parent.type === 'atrule' && rule.parent.name === 'layer' && rule.parent.params === 'theme') {
      if (rule.selector === ':root, :host') rule.selector = ':where(:root, :host)';
    }
  });
  compiledCss = root.toString();
}

writeFileSync(outputPath, compiledCss, 'utf8');
// Tailwind hosts need the same compiled aliases as plain-CSS hosts.
const themeMetadata = postcss.root();
postcss.parse(sourceCss).walkAtRules((rule) => {
  if (rule.name === 'theme' || rule.name === 'source') themeMetadata.append(rule.clone());
});
writeFileSync(themeOutputPath, `${compiledCss}\n${themeMetadata.toString()}\n`, 'utf8');
console.info(`[build-static-css] wrote ${candidates.size} candidates and ${legacyCandidates.length} utility aliases to dist/app.css`);
