import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dir, '..');
const extensions = [{ extension: '.svelte', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }];
const host: ts.ParseConfigFileHost = {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: diagnostic => {
    throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  },
};

function project(path: string): ts.ParsedCommandLine {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolve(root, path), {}, host, undefined, undefined, extensions,
  );
  if (!parsed) throw new Error(`Could not parse ${path}`);
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  }
  return parsed;
}

const requiredStrictFlags = [
  'strict', 'noUncheckedIndexedAccess', 'exactOptionalPropertyTypes',
  'noImplicitOverride', 'noPropertyAccessFromIndexSignature', 'noFallthroughCasesInSwitch',
] as const;
const inheritedStrictFlags = [
  'noImplicitAny', 'noImplicitThis', 'strictNullChecks', 'strictFunctionTypes',
  'strictBindCallApply', 'strictPropertyInitialization', 'alwaysStrict',
  'useUnknownInCatchVariables', 'strictBuiltinIteratorReturn',
] as const;

export function assertStrictOptions(name: string, options: ts.CompilerOptions): void {
  const missing = requiredStrictFlags.filter(flag => options[flag] !== true);
  const disabled = inheritedStrictFlags.filter(flag => options[flag] === false);
  if (options.skipLibCheck !== false || missing.length || disabled.length) {
    throw new Error(`${name} weakens strict checks: ${[
      ...missing, ...disabled, ...(options.skipLibCheck !== false ? ['skipLibCheck'] : []),
    ].join(', ')}`);
  }
}

export function assertStrictProject(path: string): void {
  assertStrictOptions(path, project(path).options);
}

export function assertCoverage(
  expected: readonly string[],
  browser: readonly string[],
  bun: readonly string[],
): void {
  const covered = new Set([...browser, ...bun]);
  const missing = expected.filter(file => !covered.has(file));
  if (missing.length) throw new Error(`Files missing strict checking:\n${missing.join('\n')}`);
}

export function assertRuntimeImports(file: string, source: string, runtime: 'browser' | 'bun'): void {
  const info = ts.preProcessFile(source, true, true);
  const references = [...info.importedFiles, ...info.typeReferenceDirectives].map(item => item.fileName);
  const incompatible = references.filter(name => runtime === 'browser'
    ? name === 'bun' || name === 'bun-types' || name.startsWith('bun:')
    : name === 'vite/client' || name === 'vitest' || name.startsWith('vitest/'));
  if (incompatible.length) {
    throw new Error(`${file} is assigned to ${runtime} but imports ${incompatible.join(', ')}`);
  }
}

export function checkWorkspaceCoverage(): void {
  const browser = project('tsconfig.browser.json');
  const bun = project('tsconfig.bun-tests.json');
  const inventory = project('tsconfig.json');
  assertStrictOptions('tsconfig.browser.json', browser.options);
  assertStrictOptions('tsconfig.bun-tests.json', bun.options);
  assertStrictOptions('tsconfig.json', inventory.options);
  assertCoverage(inventory.fileNames, browser.fileNames, bun.fileNames);
  for (const [runtime, files] of [['browser', browser.fileNames], ['bun', bun.fileNames]] as const) {
    for (const file of files) {
      if (file.endsWith('.svelte')) continue;
      assertRuntimeImports(relative(root, file), readFileSync(file, 'utf8'), runtime);
    }
  }
  console.info(`Type coverage: ${inventory.fileNames.length} source files; ${browser.fileNames.length} browser/Node, ${bun.fileNames.length} Bun roots.`);
}

if (import.meta.main) {
  const projects = process.argv.slice(2);
  if (projects.length) {
    for (const path of projects) assertStrictProject(path);
  } else checkWorkspaceCoverage();
}
