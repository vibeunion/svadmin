import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import ts from 'typescript';
import boundaries from './unsafe-boundaries.json';

const root = resolve(import.meta.dir, '..');
const used = new Set<string>();
const failures: string[] = [];
function visit(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.svelte-kit', 'build', '.git'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { visit(path); continue; }
    if (!/\.(ts|svelte)$/.test(entry.name)) continue;
    const source = readFileSync(path, 'utf8');
    if (!source.includes('@svadmin/core/unsafe')) continue;
    const regions = entry.name.endsWith('.svelte')
      ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => {
        const content = match[1];
        if (content === undefined) throw new Error(`Missing script content in ${path}`);
        return content;
      })
      : [source];
    for (const region of regions) {
      const ast = ts.createSourceFile(path, region, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const inspect = (node: ts.Node): void => {
        const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
          : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
            || ts.isIdentifier(node.expression) && node.expression.text === 'require') ? node.arguments[0] : undefined;
        if (specifier && ts.isStringLiteral(specifier) && specifier.text === '@svadmin/core/unsafe') {
          const file = relative(root, path);
          used.add(file);
          if (!Object.hasOwn(boundaries, file)) failures.push(`${file}: unchecked imports require a reviewed boundary entry`);
        }
        ts.forEachChild(node, inspect);
      };
      inspect(ast);
    }
  }
}
for (const directory of ['packages', 'example', 'scripts/fixtures']) visit(resolve(root, directory));
for (const path of Object.keys(boundaries)) {
  if (!used.has(path)) failures.push(`${path}: remove the obsolete unchecked boundary entry`);
}
if (failures.length) throw new Error(failures.join('\n'));
console.info(`Checked ${used.size} explicit unchecked boundaries; the application scaffold has none.`);
