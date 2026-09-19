import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const forbidden = /^(?:tailwindcss|@tailwindcss\/[^/@\s]+|tw-animate-css|tailwind-variants|shadcn-svelte)(?:$|@|\/)/;
const directives = new Set(['theme', 'source', 'apply', 'utility', 'custom-variant', 'tailwind', 'reference', 'variant', 'config', 'plugin', 'screen', 'responsive', 'variants']);
export const isForbiddenPackage = (value) => forbidden.test(value.replace(/^npm:/, ''));

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
      if (isForbiddenPackage(name) || (typeof spec === 'string' && isForbiddenPackage(spec))) found.push(`${section}.${name}`);
    }
  }
  const bundled = pkg.bundledDependencies ?? pkg.bundleDependencies;
  if (Array.isArray(bundled)) for (const name of bundled) if (isForbiddenPackage(name)) found.push(`bundledDependencies.${name}`);
  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    if (/(?:^|\s)(?:npx\s+|bunx\s+|pnpm\s+dlx\s+)?(?:shadcn-svelte|tailwindcss)(?:@[^\s]+)?(?:\s|$)/.test(command)) found.push(`scripts.${name}`);
  }
  return found;
}

/** Bun 文本锁中的 key、npm alias 和已解析包标识都要检查，不能只查直接依赖。 */
export function lockViolations(text) {
  const found = new Set();
  for (const match of text.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
    const value = JSON.parse(match[0]);
    if (isForbiddenPackage(value)) found.add(value);
  }
  return [...found].sort();
}

/** 使用轻量词法扫描提取静态模块标识，保持边界检查无需安装仓库依赖。 */
export function moduleSpecifiers(source, filename = 'source.ts') {
  const scripts = filename.endsWith('.svelte')
    ? [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1])
    : [source];
  const result = [];

  const isIdentifierStart = (char) => /[A-Za-z_$]/.test(char ?? '');
  const isIdentifierPart = (char) => /[A-Za-z0-9_$]/.test(char ?? '');
  const skipTrivia = (text, index, end) => {
    while (index < end) {
      if (/\s/.test(text[index])) {
        index++;
      } else if (text.startsWith('//', index)) {
        const lineEnd = text.indexOf('\n', index + 2);
        index = lineEnd < 0 ? end : lineEnd + 1;
      } else if (text.startsWith('/*', index)) {
        const commentEnd = text.indexOf('*/', index + 2);
        index = commentEnd < 0 ? end : commentEnd + 2;
      } else {
        break;
      }
    }
    return index;
  };
  const readString = (text, index, end) => {
    const quote = text[index++];
    const start = index;
    while (index < end) {
      if (text[index] === '\\') {
        index += 2;
      } else if (text[index] === quote) {
        return { value: text.slice(start, index), next: index + 1 };
      } else {
        index++;
      }
    }
    return { value: null, next: end };
  };
  const addStringArgument = (text, index, end) => {
    index = skipTrivia(text, index, end);
    if (text[index] !== '"' && text[index] !== "'") return index;
    const parsed = readString(text, index, end);
    if (parsed.value !== null) result.push(parsed.value);
    return parsed.next;
  };
  const scan = (text, start, end) => {
    for (let index = start; index < end;) {
      index = skipTrivia(text, index, end);
      if (index >= end) break;
      if (text[index] === '"' || text[index] === "'") {
        index = readString(text, index, end).next;
        continue;
      }
      if (text[index] === '`') {
        const templateEnd = text.indexOf('`', index + 1);
        const template = templateEnd < 0 ? end : templateEnd;
        for (const expression of text.slice(index + 1, template).matchAll(/\$\{([\s\S]*?)\}/g)) {
          scan(expression[1], 0, expression[1].length);
        }
        index = templateEnd < 0 ? end : templateEnd + 1;
        continue;
      }
      if (!isIdentifierStart(text[index])) {
        index++;
        continue;
      }
      const identifierStart = index;
      index++;
      while (index < end && isIdentifierPart(text[index])) index++;
      const identifier = text.slice(identifierStart, index);
      const afterIdentifier = skipTrivia(text, index, end);
      if (identifier === 'require' && text[afterIdentifier] === '(') {
        index = addStringArgument(text, afterIdentifier + 1, end);
      } else if (identifier === 'import') {
        if (text[afterIdentifier] === '(') {
          index = addStringArgument(text, afterIdentifier + 1, end);
        } else if (text[afterIdentifier] === '"' || text[afterIdentifier] === "'") {
          index = addStringArgument(text, afterIdentifier, end);
        } else {
          const statementEnd = text.indexOf(';', afterIdentifier);
          const limit = statementEnd < 0 ? end : statementEnd;
          let cursor = afterIdentifier;
          while (cursor < limit) {
            cursor = skipTrivia(text, cursor, limit);
            if (text.startsWith('from', cursor) && !isIdentifierPart(text[cursor - 1]) && !isIdentifierPart(text[cursor + 4])) {
              addStringArgument(text, cursor + 4, limit);
              break;
            }
            cursor++;
          }
          scan(text, afterIdentifier, limit);
          index = limit;
        }
      } else if (identifier === 'export') {
        const statementEnd = text.indexOf(';', afterIdentifier);
        const limit = statementEnd < 0 ? end : statementEnd;
        let cursor = afterIdentifier;
        while (cursor < limit) {
          cursor = skipTrivia(text, cursor, limit);
          if (text.startsWith('from', cursor) && !isIdentifierPart(text[cursor - 1]) && !isIdentifierPart(text[cursor + 4])) {
            addStringArgument(text, cursor + 4, limit);
            break;
          }
          cursor++;
        }
        index = limit;
      }
    }
  };
  for (const script of scripts) {
    scan(script, 0, script.length);
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
    if (/components\.json$/.test(path)) {
      const config = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
      if ('tailwind' in config || String(config.$schema ?? '').includes('shadcn-svelte')) found.push(`${path}: shadcn-svelte/Tailwind generator configuration`);
    }
    if (/(?:^|[/.\-])(?:test|spec)(?:[/.\-]|$)/i.test(path)) continue;
    if (path.endsWith('.css')) found.push(...cssViolations(readFileSync(resolve(root, path), 'utf8')).map(reason => `${path}: ${reason}`));
    if (/\.(?:svelte|[cm]?[jt]sx?)$/.test(path)) {
      const source = readFileSync(resolve(root, path), 'utf8');
      for (const specifier of moduleSpecifiers(source, path)) {
        if (isForbiddenPackage(specifier)) found.push(`${path}: forbidden import ${specifier}`);
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
