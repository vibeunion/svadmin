import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const postcss = require('postcss');
const ts = require('typescript');
const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'resolutions'];
const forbiddenDirectives = new Set(['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind', 'plugin', 'config']);

export function forbiddenPackage(value) {
  if (typeof value !== 'string') return false;
  const text = value.replace(/^npm:/, '');
  return /^(?:@tailwindcss\/[^/@]+|tailwindcss|tailwind-merge|tailwind-variants|tw-animate-css|cn)(?:@|\/|$)/.test(text);
}

export function manifestProblems(manifest) {
  const errors = [];
  for (const section of sections) {
    const walk = (value) => {
      if (!value || typeof value !== 'object') return;
      for (const [name, specifier] of Object.entries(value)) {
        if (forbiddenPackage(name) || (typeof specifier === 'string' && specifier.startsWith('npm:') && forbiddenPackage(specifier))) errors.push(`${section}: ${name}`);
        if (typeof specifier === 'object') walk(specifier);
      }
    };
    walk(manifest[section]);
  }
  return errors;
}

export function importProblems(text, filename = 'source.ts') {
  const errors = [];
  const parsed = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const inspect = (node) => {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) specifier = node.moduleSpecifier;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) specifier = node.arguments[0];
    if (specifier && ts.isStringLiteralLike(specifier) && forbiddenPackage(specifier.text)) errors.push(specifier.text);
    ts.forEachChild(node, inspect);
  };
  inspect(parsed);
  return errors;
}

export function cssProblems(text) {
  const errors = [];
  postcss.parse(text).walkAtRules((rule) => {
    if (forbiddenDirectives.has(rule.name)) errors.push(`@${rule.name}`);
    if (rule.name === 'import') {
      const target = /^["']([^"']+)["']/.exec(rule.params)?.[1];
      if (target && forbiddenPackage(target)) errors.push(`@import ${target}`);
    }
  });
  return errors;
}

function installedPackages(directory, visited = new Set()) {
  if (!existsSync(directory)) return [];
  const real = realpathSync(directory);
  if (visited.has(real)) return [];
  visited.add(real);
  const problems = [];
  for (const entry of readdirSync(directory)) {
    if (entry.startsWith('.')) continue;
    const path = resolve(directory, entry);
    if (entry.startsWith('@')) { problems.push(...installedPackages(path, visited)); continue; }
    const manifest = resolve(path, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (forbiddenPackage(name)) problems.push(name);
    problems.push(...installedPackages(resolve(path, 'node_modules'), visited));
  }
  return problems;
}

export function verifyStyleBoundary({ sourceOnly = false } = {}) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const problems = [];
  const report = (file, values) => { for (const value of values) problems.push(`${file}: ${value}`); };
  for (const file of tracked) {
    if (!existsSync(resolve(root, file))) continue;
    if (/(?:^|\/)package\.json$/.test(file)) report(file, manifestProblems(JSON.parse(readFileSync(resolve(root, file), 'utf8'))));
    if (/style-baselines\//.test(file) || /\.(?:test|spec)\./.test(file)) continue;
    if (/\.(?:svelte|[cm]?js|[cm]?ts|css)$/.test(file)) {
      const content = readFileSync(resolve(root, file), 'utf8');
      if (file.endsWith('.css')) report(file, cssProblems(content));
      else if (file.endsWith('.svelte')) {
        for (const match of content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) report(file, importProblems(match[1], file));
        for (const match of content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) report(file, cssProblems(match[1]));
      } else report(file, importProblems(content, file));
    }
  }
  const locked = ts.parseConfigFileTextToJson('bun.lock', readFileSync(resolve(root, 'bun.lock'), 'utf8'));
  assert.ok(!locked.error, 'Lockfile must be valid JSONC');
  for (const [name, value] of Object.entries(locked.config.packages ?? {})) {
    if (forbiddenPackage(name) || (Array.isArray(value) && forbiddenPackage(value[0]))) report('bun.lock', [name]);
  }
  for (const [name, workspace] of Object.entries(locked.config.workspaces ?? {})) report(`bun.lock:${name}`, manifestProblems(workspace));
  report('installed dependency graph', installedPackages(resolve(root, 'node_modules')));
  if (!sourceOnly) {
    for (const packageName of ['ui', 'ai-elements', 'surface', 'lite', 'flow', 'editor']) {
      const directory = resolve(root, 'packages', packageName, 'dist');
      assert.ok(existsSync(directory), `${packageName} must be built before published-style verification`);
      for (const file of readdirSync(directory, { recursive: true })) {
        if (file.endsWith('.css')) report(`${packageName}/dist/${file}`, cssProblems(readFileSync(resolve(directory, file), 'utf8')));
      }
    }
  }
  const vendor = resolve(root, 'packages/ai-elements/vendor/streamdown');
  const provenance = JSON.parse(readFileSync(resolve(vendor, 'provenance.json'), 'utf8'));
  for (const [file, expected] of Object.entries(provenance.originalFileHashes)) {
    if (provenance.modifiedFiles.includes(file)) continue;
    const actual = createHash('sha256').update(readFileSync(resolve(vendor, file))).digest('hex');
    assert.equal(actual, expected, `Vendored parser/security source changed: ${file}`);
  }
  assert.equal(problems.length, 0, `Style boundary violations:\n${problems.join('\n')}`);
  console.info('Style boundary passed: workspace manifests, aliases, lockfile, installed graph, production imports, CSS entries, and parser integrity.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verifyStyleBoundary({ sourceOnly: process.argv.includes('--source') });
