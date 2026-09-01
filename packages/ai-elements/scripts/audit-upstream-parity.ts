import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import { AI_ELEMENT_PARITY, AI_ELEMENTS_UPSTREAM_SNAPSHOT } from '../src/parity-manifest.js';

export interface AuditOptions {
  officialRoot: string;
  vueRoot?: string;
  localRoot: string;
}

interface ExportInventory {
  family: string;
  exports: string[];
}

function sourceFile(path: string, source: string): ts.SourceFile {
  const kind = extname(path) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(ts.getModifiers(node as ts.HasModifiers)?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword));
}

function isZodSpecifier(specifier: string): boolean {
  return /(^|[/@-])zod(?:[/@-]|$)/i.test(specifier);
}

export function collectRuntimeExports(path: string, source: string): string[] {
  const names = new Set<string>();
  const file = sourceFile(path, source);

  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      if (statement.isTypeOnly) continue;
      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) names.add(element.name.text);
      }
      continue;
    }
    if (!hasExportModifier(statement)) continue;
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
  }

  return [...names].sort();
}

export function collectImportSpecifiers(path: string, source: string): string[] {
  const specifiers: string[] = [];
  const file = sourceFile(path, source);
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text);
    }
    if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some((declaration) =>
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        ts.isIdentifier(declaration.initializer.expression) &&
        declaration.initializer.expression.text === 'require' &&
        declaration.initializer.arguments.some((argument) => ts.isStringLiteral(argument) && isZodSpecifier(argument.text)))
    ) {
      specifiers.push('zod');
    }
  }
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const moduleSpecifier = node.arguments[0];
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier) && isZodSpecifier(moduleSpecifier.text)) {
        specifiers.push(moduleSpecifier.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return specifiers;
}

function svelteScripts(path: string, source: string): string[] {
  const ast = parse(source, { filename: path, modern: true });
  return [ast.module, ast.instance]
    .filter((script): script is NonNullable<typeof script> => Boolean(script))
    .map((script) => source.slice(script.content.start, script.content.end));
}

function walkFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

export function findZodImports(root: string): string[] {
  const violations: string[] = [];
  for (const path of walkFiles(root)) {
    const extension = extname(path);
    if (!['.ts', '.tsx', '.svelte'].includes(extension) || /(?:^|\/)dist\//.test(path)) continue;
    const source = readFileSync(path, 'utf8');
    const scripts = extension === '.svelte' ? svelteScripts(path, source) : [source];
    if (scripts.some((script) => collectImportSpecifiers(path, script).some(isZodSpecifier))) {
      violations.push(path);
    }
  }
  return violations.sort();
}

function officialInventory(root: string): ExportInventory[] {
  return readdirSync(root)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => ({
      family: basename(file, '.tsx'),
      exports: collectRuntimeExports(join(root, file), readFileSync(join(root, file), 'utf8')),
    }))
    .sort((left, right) => left.family.localeCompare(right.family));
}

function resolveExportTarget(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const base = resolve(from, '..', specifier);
  return [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]
    .find((candidate) => existsSync(candidate));
}

function collectRuntimeExportsFromFile(path: string, seen = new Set<string>()): string[] {
  if (seen.has(path)) return [];
  seen.add(path);
  const source = readFileSync(path, 'utf8');
  const names = new Set(collectRuntimeExports(path, source));
  const file = sourceFile(path, source);
  for (const statement of file.statements) {
    if (!ts.isExportDeclaration(statement) || statement.exportClause || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const target = resolveExportTarget(path, statement.moduleSpecifier.text);
    if (target) for (const name of collectRuntimeExportsFromFile(target, seen)) names.add(name);
  }
  return [...names].sort();
}

function vueInventory(root: string): ExportInventory[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'index.ts')))
    .map((entry) => ({
      family: entry.name,
      exports: collectRuntimeExportsFromFile(join(root, entry.name, 'index.ts')),
    }))
    .sort((left, right) => left.family.localeCompare(right.family));
}

function difference(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

export function auditUpstreamParity(options: AuditOptions): void {
  const manifest = new Map(AI_ELEMENT_PARITY.map((entry) => [entry.upstream, entry.officialExports]));
  const official = officialInventory(options.officialRoot);
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const commit = execFileSync('git', ['-C', options.officialRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (commit !== AI_ELEMENTS_UPSTREAM_SNAPSHOT.commit) {
      errors.push(`Official upstream checkout is ${commit}, expected ${AI_ELEMENTS_UPSTREAM_SNAPSHOT.commit}`);
    }
  } catch (error) {
    errors.push(`Unable to verify official upstream checkout: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const { family, exports } of official) {
    const expected = manifest.get(family);
    if (!expected) {
      errors.push(`Official family is not classified: ${family}`);
      continue;
    }
    const missing = difference(exports, expected);
    const stale = difference(expected, exports);
    if (missing.length) errors.push(`${family}: missing manifest exports ${missing.join(', ')}`);
    if (stale.length) errors.push(`${family}: stale manifest exports ${stale.join(', ')}`);
  }

  for (const family of difference([...manifest.keys()], official.map(({ family }) => family))) {
    errors.push(`Manifest family is absent upstream: ${family}`);
  }

  if (options.vueRoot) {
    const vue = new Map(vueInventory(options.vueRoot).map((entry) => [entry.family, entry.exports]));
    for (const { family, exports } of official) {
      const vueExports = vue.get(family);
      if (!vueExports) {
        warnings.push(`${family}: VuePont does not expose this official family`);
        continue;
      }
      // VuePont intentionally exposes component files only; helper composables
      // are framework-specific and are audited by the local manifest separately.
      const componentExports = new Set(
        (AI_ELEMENT_PARITY.find((entry) => entry.upstream === family)?.exports ?? [])
          .filter(({ kind }) => kind === 'component')
          .map(({ upstream }) => upstream),
      );
      const missing = difference(exports.filter((name) => componentExports.has(name)), vueExports);
      if (missing.length) warnings.push(`${family}: VuePont lacks official exports ${missing.join(', ')}`);
    }
  }

  const zodImports = findZodImports(options.localRoot);
  if (zodImports.length) errors.push(`Zod imports found:\n${zodImports.join('\n')}`);
  if (errors.length) throw new Error(errors.join('\n'));

  console.info(JSON.stringify({
    upstreamCommit: AI_ELEMENTS_UPSTREAM_SNAPSHOT.commit,
    families: official.length,
    runtimeExports: official.reduce((count, entry) => count + entry.exports.length, 0),
    vueFamiliesCompared: options.vueRoot ? vueInventory(options.vueRoot).length : 0,
    vueDifferences: warnings,
    zodImports: 0,
  }, null, 2));
}

if (import.meta.main) {
  const officialRoot = resolve(process.argv[2] ?? '/private/tmp/upstream-ai-elements-official/packages/elements/src');
  const vueRoot = resolve(process.argv[3] ?? '/private/tmp/upstream-ai-elements-vue/packages/elements/src');
  const localRoot = resolve(import.meta.dir, '..', 'src');
  auditUpstreamParity({ officialRoot, vueRoot: existsSync(vueRoot) ? vueRoot : undefined, localRoot });
}
