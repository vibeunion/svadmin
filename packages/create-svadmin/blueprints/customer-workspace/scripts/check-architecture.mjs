import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

const extensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.svelte']);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const file = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(file) : extensions.has(extname(file)) ? [file] : [];
  });
}

function templateImports(node, file, failures) {
  if (!node || typeof node !== 'object') return [];
  const found = [];
  const value = node.type === 'ImportExpression' ? node.source
    : node.type === 'CallExpression' && node.callee?.name === 'require' ? node.arguments[0] : undefined;
  if (node.type === 'ImportExpression' || (node.type === 'CallExpression' && node.callee?.name === 'require')) {
    if (value?.type === 'Literal' && typeof value.value === 'string') found.push(value.value);
    else failures.push(`${file}: computed module imports cannot be checked`);
  }
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) found.push(...child.flatMap(item => templateImports(item, file, failures)));
    else if (child && typeof child === 'object') found.push(...templateImports(child, file, failures));
  }
  return found;
}

function fileImports(file, failures) {
  const text = readFileSync(file, 'utf8');
  if (!file.endsWith('.svelte')) return imports(file, text, failures);
  const ast = parse(text, { modern: true });
  return [
    ...[ast.module, ast.instance].filter(Boolean).flatMap(script =>
      imports(file, text.slice(script.content.start, script.content.end), failures)),
    ...templateImports(ast.fragment, file, failures),
  ];
}

function imports(file, source, failures) {
  const specifiers = [];
  const kind = ['.tsx', '.jsx'].includes(extname(file)) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  for (const error of tree.parseDiagnostics) {
    failures.push(`${file}: parse error: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`);
  }
  function visit(node) {
    let value;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) value = node.moduleReference.expression;
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) value = node.argument.literal;
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      value = node.arguments[0];
      if (!value || !ts.isStringLiteralLike(value)) failures.push(`${file}: computed module imports cannot be checked`);
    }
    if (value && ts.isStringLiteralLike(value)) specifiers.push(value.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return specifiers;
}

function featurePath(root, file) {
  const parts = relative(resolve(root, 'src/features'), file).split(/[\\/]/u);
  if (parts[0] === '..' || parts[0] === '') return undefined;
  return { name: parts[0], entry: parts.slice(1).join('/') };
}

function resolveImport(specifier, file, options, failures) {
  if (specifier.startsWith('.')) return resolve(dirname(file), specifier);
  const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule?.resolvedFileName;
  if (resolved) return resolved;
  // 未解析的路径别名可能隐藏跨模块引用，不能当作普通 npm 依赖放行。
  const aliases = Object.keys(options.paths ?? {});
  const alias = aliases.filter(alias => alias.includes('*')
    ? specifier.startsWith(alias.split('*')[0]) && specifier.endsWith(alias.split('*')[1])
    : specifier === alias).sort((a, b) =>
      Number(b === specifier) - Number(a === specifier)
      || b.split('*')[0].length - a.split('*')[0].length)[0];
  if (alias) {
    const [prefix, suffix = ''] = alias.split('*');
    const wildcard = specifier.slice(prefix.length, specifier.length - suffix.length);
    for (const mapping of options.paths[alias]) {
      const candidate = resolve(options.baseUrl ?? options.pathsBasePath, mapping.replace('*', wildcard));
      if (candidate.endsWith('.svelte') && existsSync(candidate)) return candidate;
    }
    failures.push(`${file}: unresolved path alias ${specifier}`);
  }
  return undefined;
}

function checkImport(root, file, specifier, options, failures) {
  if (/^@svadmin\/[^/]+\/(?:src|dist)(?:\/|$)/u.test(specifier)) {
    failures.push(`${relative(root, file)}: use public package exports, not ${specifier}`);
  }
  const target = resolveImport(specifier, file, options, failures);
  if (!target) return;
  const from = featurePath(root, file);
  const to = featurePath(root, target);
  if (!to || from?.name === to.name) return;
  if (!['', 'index', 'data'].includes(to.entry.replace(/\.(?:ts|js|mts|cts|mjs|cjs)$/u, ''))) {
    failures.push(`${relative(root, file)}: ${specifier} bypasses the ${to.name} public index.ts/data.ts entry`);
  }
}

export function checkArchitecture(root) {
  const failures = [];
  const configFile = resolve(root, 'tsconfig.json');
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const configErrors = parsed.errors.filter(error => error.code !== 18003);
  if (configErrors.length) throw new Error(configErrors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  const features = resolve(root, 'src/features');
  if (existsSync(features)) {
    for (const entry of readdirSync(features, { withFileTypes: true })) {
      if (entry.isDirectory() && !existsSync(resolve(features, entry.name, 'index.ts'))) {
        failures.push(`src/features/${entry.name}: missing public index.ts`);
      }
    }
  }
  const source = resolve(root, 'src');
  for (const file of existsSync(source) ? walk(source) : []) {
    for (const specifier of fileImports(file, failures)) {
      checkImport(root, file, specifier, parsed.options, failures);
    }
  }
  return failures;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkArchitecture(process.cwd());
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else console.info('Feature architecture boundaries passed.');
}
