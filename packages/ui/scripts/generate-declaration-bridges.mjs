import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const declarationFilePattern = /\.d\.(?:ts|mts|cts)$/;
const svelteJsSpecifierPattern = /(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+\.svelte\.js)['"]/g;

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectDeclarationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectDeclarationFiles(path));
    } else if (entry.isFile() && declarationFilePattern.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

function svelteJsSpecifiers(source) {
  return [...source.matchAll(svelteJsSpecifierPattern)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('.'));
}

async function hasDefaultExport(declarationPath) {
  const source = await readFile(declarationPath, 'utf8');
  return /(?:^|\n)\s*export\s+default\b/.test(source)
    || /(?:^|\n)\s*export\s*\{[^}]*\bdefault\b[^}]*\}/.test(source);
}

/**
 * Generates `*.d.svelte.ts` bridges for explicit `*.svelte.js` declaration
 * references. TypeScript and tsgo resolve those specifiers through the
 * arbitrary-extension declaration filename, while svelte-package only emits
 * `*.svelte.d.ts`. The bridge keeps one canonical module identity.
 */
export async function generateDeclarationBridges(distDirectory) {
  const root = resolve(distDirectory);
  const declarations = await collectDeclarationFiles(root);
  const sources = new Set();

  for (const declaration of declarations) {
    for (const specifier of svelteJsSpecifiers(await readFile(declaration, 'utf8'))) {
      const target = resolve(dirname(declaration), specifier);
      const targetDeclaration = target.replace(/\.svelte\.js$/, '.svelte.d.ts');
      if (!await exists(target) || !await exists(targetDeclaration)) continue;
      sources.add(target);
    }
  }

  let generated = 0;
  for (const target of [...sources].sort()) {
    const bridge = target.replace(/\.svelte\.js$/, '.d.svelte.ts');
    if (await exists(bridge)) continue;
    const exportName = basename(target);
    const lines = [`export * from './${exportName}';`];
    if (await hasDefaultExport(target.replace(/\.svelte\.js$/, '.svelte.d.ts'))) {
      lines.push(`export { default } from './${exportName}';`);
    }
    await writeFile(bridge, `${lines.join('\n')}\n`, 'utf8');
    generated += 1;
  }

  return generated;
}

if (import.meta.main) {
  const distDirectory = process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url));
  const generated = await generateDeclarationBridges(distDirectory);
  console.info(`[generate-declaration-bridges] generated ${generated} declaration bridge(s)`);
}