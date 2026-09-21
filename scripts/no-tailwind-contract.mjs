import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const forbidden = /^(?:tailwindcss|@tailwindcss\/[^/@\s]+|tw-animate-css)(?:$|@|\/)/;
const directives = new Set(['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind', 'reference', 'variant', 'config', 'plugin', 'screen', 'responsive', 'variants']);
export const isForbiddenPackage = (value) => forbidden.test(value.replace(/^npm:/, ''));
export const isPandaPackage = (value) => /^@pandacss\//.test(value.replace(/^npm:/, ''));
export const isAuthoringPackage = (value) => isForbiddenPackage(value) || /^(?:shadcn-svelte)(?:$|@|\/)/.test(value.replace(/^npm:/, ''));

// 只允许明确的构建配置/脚本加载编译器，不能豁免整个组件源码目录。
export const isBuildSource = (path) => /(?:^|\/)scripts\//.test(path)
  || /(?:^|\/)(?:vite|postcss|tailwind)\.config\.[cm]?[jt]s$/.test(path);
export const isStyleInput = (path) => /^(?:packages\/[^/]+|example)\/styles\/[^/]+\.css$/.test(path)
  || /^packages\/ui\/shadcn\/[^/]+\.css$/.test(path)
  || path === 'example/src/app.css';

/** 扫描 CSS token；注释、字符串内容里的示例文本不是编译器指令。 */
export function cssViolations(css) {
  const found = [];
  for (let i = 0; i < css.length;) {
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) { found.push('unterminated CSS comment'); break; }
      i = end + 2;
    } else if (css[i] === '"' || css[i] === "'") {
      const quote = css[i++];
      while (i < css.length && css[i] !== quote) i += css[i] === '\\' ? 2 : 1;
      i++;
    } else if (css[i] === '@') {
      const match = /^@([a-z-]+)/i.exec(css.slice(i));
      if (!match) { i++; continue; }
      const name = match[1].toLowerCase();
      if (directives.has(name)) found.push(`compiler directive @${name}`);
      if (name === 'import') {
        const rest = css.slice(i + match[0].length).replace(/\/\*[\s\S]*?\*\//g, '');
        const source = /^\s*(?:["']([^"']+)["']|url\(\s*(?:["']([^"']+)["']|([^\s)]+)))/i.exec(rest);
        const specifier = source?.[1] ?? source?.[2] ?? source?.[3];
        if (specifier && isForbiddenPackage(specifier)) found.push(`compiler import ${specifier}`);
      }
      i += match[0].length;
    } else i++;
  }
  return found;
}

export function manifestViolations(pkg) {
  const found = [];
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'resolutions']) {
    for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
      if (isPandaPackage(name) || (typeof spec === 'string' && isPandaPackage(spec))
        || (section !== 'devDependencies' && (isAuthoringPackage(name) || (typeof spec === 'string' && isAuthoringPackage(spec))))) {
        found.push(`${section}.${name}`);
      }
      if (spec && typeof spec === 'object') {
        found.push(...manifestViolations({ [section]: spec }).map(reason => `${section}.${name}.${reason}`));
      }
    }
  }
  const bundled = pkg.bundledDependencies ?? pkg.bundleDependencies;
  if (Array.isArray(bundled)) for (const name of bundled) if (isAuthoringPackage(name) || isPandaPackage(name)) found.push(`bundledDependencies.${name}`);
  if (bundled === true) for (const name of Object.keys(pkg.devDependencies ?? {})) {
    if (isAuthoringPackage(name) || isPandaPackage(name)) found.push(`bundledDependencies.${name}`);
  }
  return found;
}

/** Bun 文本锁中的 key、npm alias 和已解析包标识都要检查，不能只查直接依赖。 */
export function lockViolations(text) {
  const parsed = ts.parseConfigFileTextToJson('bun.lock', text);
  if (parsed.error) return ['invalid JSONC lockfile'];
  const found = new Set();
  for (const [name, workspace] of Object.entries(parsed.config.workspaces ?? {})) {
    for (const error of manifestViolations(workspace)) found.add(`${name}:${error}`);
  }
  // 开发依赖的编译器也会出现在 packages 中；检查依赖边而不是全局禁包。
  for (const [name, entry] of Object.entries(parsed.config.packages ?? {})) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') { found.add(`invalid package: ${name}`); continue; }
    if (isPandaPackage(entry[0])) { found.add(`${name}:removed Panda package`); continue; }
    if (isAuthoringPackage(entry[0])) continue;
    for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [dependency, version] of Object.entries(entry[2]?.[section] ?? {})) {
        if (section === 'peerDependencies' && name === 'tailwind-variants'
          && dependency === 'tailwindcss' && entry[2]?.optionalPeers?.includes(dependency)) continue;
        if (isAuthoringPackage(dependency) || (typeof version === 'string' && isAuthoringPackage(version))) {
          found.add(`${name}:${section}.${dependency}`);
        }
      }
    }
  }
  return [...found].sort();
}

/** 使用仓库已有的 TypeScript 解析器，避免把文档字符串误判为真实 import。 */
export function moduleSpecifiers(source, filename = 'source.ts') {
  const result = [];
  const scripts = filename.endsWith('.svelte')
    ? [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1])
    : [source];
  for (const script of scripts) {
    const file = ts.createSourceFile(filename, script, ts.ScriptTarget.Latest, false, filename.endsWith('.tsx') || filename.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
      else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) specifier = node.moduleReference.expression;
      else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) specifier = node.arguments[0];
      if (specifier && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))) result.push(specifier.text);
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return result;
}

export function auditNoTailwind(root, paths) {
  const found = [];
  for (const path of paths) {
    if (!existsSync(resolve(root, path))) continue;
    if (path.endsWith('package.json')) {
      const pkg = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
      found.push(...manifestViolations(pkg).map(reason => `${path}: ${reason}`));
    }
    // 候选源码目录不是发布入口；生成器可使用官方 schema 与编译器元数据。
    if (/(?:^|[/.-])(?:test|spec)(?:[/.-]|$)/i.test(path)) continue;
    if (path.endsWith('.css') && !isStyleInput(path)) found.push(...cssViolations(readFileSync(resolve(root, path), 'utf8')).map(reason => `${path}: ${reason}`));
    if (/\.(?:svelte|[cm]?[jt]sx?)$/.test(path)) {
      const source = readFileSync(resolve(root, path), 'utf8');
      for (const specifier of moduleSpecifiers(source, path)) {
        if (isPandaPackage(specifier) || (isAuthoringPackage(specifier) && !isBuildSource(path))) found.push(`${path}: forbidden import ${specifier}`);
      }
      if (path.endsWith('.svelte')) for (const match of source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)) {
        found.push(...cssViolations(match[1]).map(reason => `${path}: ${reason}`));
      }
    }
  }
  const lock = resolve(root, 'bun.lock');
  if (!existsSync(lock)) found.push('bun.lock: missing text lockfile; transitive dependencies were not audited');
  else found.push(...lockViolations(readFileSync(lock, 'utf8')).map(name => `bun.lock: forbidden package ${name}`));
  if (existsSync(resolve(root, 'bun.lockb'))) found.push('bun.lockb: binary lockfile cannot bypass the text lockfile audit');
  return [...new Set(found)];
}
