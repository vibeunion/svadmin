import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { parse } from 'svelte/compiler';

const utilityPrefixes = [
  'absolute', 'animate-', 'aspect-', 'backdrop-', 'bg-', 'block', 'border', 'bottom-', 'break-',
  'col-', 'cursor-', 'divide-', 'duration-', 'ease-', 'fill-', 'fixed', 'flex', 'float-', 'font-', 'from-',
  'gap-', 'grid', 'grow', 'h-', 'hidden', 'inline', 'inset-', 'isolate', 'items-', 'justify-',
  'leading-', 'left-', 'line-clamp-', 'list-', 'm-', 'max-', 'mb-', 'me-', 'min-', 'mix-', 'ml-',
  'mr-', 'ms-', 'mt-', 'mx-', 'my-', 'object-', 'opacity-', 'order-', 'origin-', 'outline-', 'overflow-',
  'p-', 'pb-', 'pe-', 'pl-', 'placeholder-', 'pointer-events-', 'pr-', 'pt-', 'px-', 'py-', 'relative',
  'resize-', 'right-', 'ring-', 'rounded', 'rotate-', 'row-', 'scale-', 'select-', 'self-', 'shadow',
  'shrink', 'size-', 'skew-', 'space-', 'sr-only', 'start-', 'static', 'sticky', 'stroke-', 'table-',
  'tabular-nums', 'text-', 'to-', 'top-', 'tracking-', 'transform', 'transition', 'translate-', 'truncate', 'underline',
  'via-', 'visible', 'w-', 'whitespace-', 'will-change-', 'z-',
];

const variantPrefixes = [
  'active:', 'aria-', 'before:', 'checked:', 'data-', 'dark:', 'disabled:', 'first:', 'focus-', 'focus:',
  'group-', 'hover:', 'last:', 'lg:', 'md:', 'motion-', 'not-', 'open:', 'print:', 'sm:', 'xl:', '2xl:',
];

const classBindingName = /^(?:className|classMap|colorMap|dotClass|iconClass|toneClass|toneClasses|widthClass|gridClass|sizeClasses|variantMap|activeBadge|inactiveBadge)$/u;

function collectFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const file = join(root, entry);
    if (statSync(file).isDirectory()) files.push(...collectFiles(file));
    else if (file.endsWith('.svelte')) files.push(file);
  }
  return files;
}

function isUtilityToken(token) {
  if (!token || token.startsWith('svadmin-u-')) return false;
  const base = token.replace(/^!?-/, '').split(':').pop();
  return utilityPrefixes.some((prefix) => base === prefix || base.startsWith(prefix))
    || variantPrefixes.some((prefix) => token.startsWith(prefix));
}

function aliasFor(token) {
  return `svadmin-u-${createHash('sha1').update(token).digest('hex').slice(0, 12)}`;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (visit(node) === false) return;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function replaceClassAttribute(source, ast, mappings, edits) {
  walk(ast.html, (node) => {
    if (node.type === 'Class') {
      const token = node.name;
      if (isUtilityToken(token)) {
        mappings[token] ??= aliasFor(token);
        edits.push({ start: node.start + 6, end: node.start + 6 + token.length, replacement: mappings[token] });
      }
    }

    if (node.type !== 'Attribute' || !['class', 'className'].includes(node.name)) return;
    for (const value of node.value ?? []) {
      if (value.type === 'Text') {
        for (const match of (value.data ?? '').matchAll(/\S+/gu)) {
          const token = match[0];
          if (!isUtilityToken(token)) continue;
          mappings[token] ??= aliasFor(token);
          edits.push({ start: value.start + match.index, end: value.start + match.index + token.length, replacement: mappings[token] });
        }
      } else if (value.type === 'MustacheTag') {
        walk(value.expression, (expression) => {
          if (expression.type === 'BinaryExpression' || expression.type === 'MemberExpression') return false;
          if (expression.type === 'TemplateLiteral') {
            // Partial tokens around interpolations cannot be renamed safely.
            if (expression.expressions.length) return false;
            for (const quasi of expression.quasis) {
              const raw = quasi.value.raw;
              const replacement = raw.split(/(\s+)/u).map((token) => {
                if (!isUtilityToken(token)) return token;
                mappings[token] ??= aliasFor(token);
                return mappings[token];
              }).join('');
              if (replacement !== raw) {
                edits.push({ start: quasi.start, end: quasi.end, replacement });
              }
            }
            return;
          }
          if (expression.type !== 'Literal' || typeof expression.value !== 'string') return;
          const replacement = expression.value.split(/(\s+)/u).map((token) => {
            if (!isUtilityToken(token)) return token;
            mappings[token] ??= aliasFor(token);
            return mappings[token];
          }).join('');
          if (replacement !== expression.value) {
            edits.push({ start: expression.start + 1, end: expression.end - 1, replacement });
          }
        });
      }
    }
  });
}

function replaceScriptClassStrings(source, ast, mappings, edits) {
  for (const script of [ast.instance, ast.module]) {
    if (!script?.content) continue;
    walk(script.content, (node) => {
      if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !classBindingName.test(node.id.name)) return;
      const renameValue = (expression) => {
        if (!expression) return;
        if (expression.type === 'ObjectExpression') {
          for (const property of expression.properties) {
            if (property.type === 'Property') renameValue(property.value);
          }
        } else if (expression.type === 'ArrayExpression') {
          expression.elements.forEach(renameValue);
        } else if (expression.type === 'Literal' && typeof expression.value === 'string') {
          const replacement = expression.value.split(/(\s+)/u).map((token) => {
            if (!isUtilityToken(token)) return token;
            mappings[token] ??= aliasFor(token);
            return mappings[token];
          }).join('');
          if (replacement !== expression.value) {
            edits.push({ start: expression.start, end: expression.end, replacement: JSON.stringify(replacement) });
          }
        }
      };
      renameValue(node.init);
    });
  }
}

export function migrateSource(source, mappings = {}) {
  const ast = parse(source);
  const edits = [];
  replaceClassAttribute(source, ast, mappings, edits);
  replaceScriptClassStrings(source, ast, mappings, edits);
  let next = source;
  const uniqueEdits = [...new Map(edits.map((edit) => [`${edit.start}:${edit.end}`, edit])).values()];
  for (const edit of uniqueEdits.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, edit.start)}${edit.replacement}${next.slice(edit.end)}`;
  }
  parse(next);
  return next;
}

if (import.meta.url.startsWith('file:') && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  const sourceRoot = join(packageRoot, 'src');
  const mapPath = join(packageRoot, 'scripts', 'utility-class-map.json');
  const mappings = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
  const updates = collectFiles(sourceRoot).map((file) => {
    const source = readFileSync(file, 'utf8');
    return { file, source, next: migrateSource(source, mappings) };
  });
  // Validate every component before writing any migration output.
  for (const { file, source, next } of updates) {
    if (next !== source) writeFileSync(file, next, 'utf8');
  }
  writeFileSync(mapPath, `${JSON.stringify(mappings, null, 2)}\n`, 'utf8');
  console.info(`[migrate-utility-class-names] registered ${Object.keys(mappings).length} utility aliases`);
}
