/**
 * Server-side rich content rendering for `@svadmin/lite`.
 *
 * Both helpers build HTML from untrusted strings, so every literal character is
 * escaped first and only a fixed tag/attribute allowlist survives. The output is
 * meant to be rendered with `{@html ...}` inside SSR markup — no client script,
 * no DOM, no sanitizer dependency.
 */
import { toSafeHref, toSafeText } from './security';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ESCAPES[character] ?? character);
}

const INLINE_CODE = /`([^`\n]+)`/u;
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/u;

/** Apply inline emphasis to an already-escaped fragment. */
function emphasize(value: string): string {
  return value
    .replace(/\*\*([^*\n]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/gu, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/gu, '<em>$1</em>')
    .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/gu, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/gu, '<s>$1</s>');
}

/**
 * Inline Markdown for one text run. Code spans and links are tokenized before
 * escaping so their contents never re-enter the emphasis rules.
 */
export function renderInlineMarkdown(source: string): string {
  let rest = source;
  let output = '';

  while (rest.length > 0) {
    const code = INLINE_CODE.exec(rest);
    const link = LINK.exec(rest);
    const next = [code, link]
      .filter((match): match is RegExpExecArray => match !== null)
      .sort((a, b) => a.index - b.index)[0];

    if (!next) {
      output += emphasize(escapeHtml(rest));
      break;
    }

    output += emphasize(escapeHtml(rest.slice(0, next.index)));

    if (next === code) {
      output += `<code>${escapeHtml(next[1] ?? '')}</code>`;
    } else {
      const label = emphasize(escapeHtml(next[1] ?? ''));
      const href = toSafeHref(next[2] ?? '');
      output += href
        ? `<a href="${escapeHtml(href)}" rel="noreferrer">${label}</a>`
        : label;
    }

    rest = rest.slice(next.index + next[0].length);
  }

  return output;
}

const HEADING = /^(#{1,6})\s+(.*)$/u;
const UNORDERED = /^\s*[-*+]\s+(.*)$/u;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/u;
const QUOTE = /^\s*>\s?(.*)$/u;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/u;
const FENCE = /^\s*```([\w-]*)\s*$/u;

/**
 * Render a Markdown subset (headings, lists, quotes, fenced code, rules,
 * paragraphs, inline code/emphasis/links). Unsupported syntax stays literal
 * text, which is safer than silently dropping user content.
 */
export function renderMarkdown(value: unknown): string {
  const source = toSafeText(value).replace(/\r\n?/gu, '\n');
  if (source.trim() === '') return '';

  const lines = source.split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.map((line) => renderInlineMarkdown(line)).join('<br />')}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';

    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && !FENCE.test(lines[cursor] ?? '')) {
        code.push(lines[cursor] ?? '');
        cursor += 1;
      }
      index = cursor;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      blocks.push(`<pre><code${language}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    if (RULE.test(line)) {
      flush();
      blocks.push('<hr />');
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const level = heading[1]?.length ?? 1;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2] ?? '')}</h${level}>`);
      continue;
    }

    if (UNORDERED.test(line) || ORDERED.test(line)) {
      flush();
      const ordered = ORDERED.test(line);
      const pattern = ordered ? ORDERED : UNORDERED;
      const items: string[] = [];
      let cursor = index;
      while (cursor < lines.length) {
        const item = pattern.exec(lines[cursor] ?? '');
        if (!item) break;
        items.push(`<li>${renderInlineMarkdown(item[1] ?? '')}</li>`);
        cursor += 1;
      }
      index = cursor - 1;
      blocks.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flush();
      const quoted: string[] = [];
      let cursor = index;
      while (cursor < lines.length) {
        const inner = QUOTE.exec(lines[cursor] ?? '');
        if (!inner) break;
        quoted.push(inner[1] ?? '');
        cursor += 1;
      }
      index = cursor - 1;
      blocks.push(`<blockquote><p>${quoted.map((line) => renderInlineMarkdown(line)).join('<br />')}</p></blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks.join('\n');
}

const ALLOWED_TAGS: Record<string, readonly string[]> = {
  a: ['href', 'title'],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  s: [],
  p: [],
  br: [],
  hr: [],
  ul: [],
  ol: [],
  li: [],
  blockquote: [],
  code: [],
  pre: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  img: ['src', 'alt', 'title'],
};

const VOID_TAGS = new Set(['br', 'hr', 'img']);
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu;

function safeAttributeValue(tag: string, name: string, raw: string): string | undefined {
  const value = raw.trim();
  if (tag === 'a' && name === 'href') {
    const href = toSafeHref(value);
    return href ? escapeHtml(href) : undefined;
  }
  if (tag === 'img' && name === 'src') {
    const src = toSafeHref(value);
    return src ? escapeHtml(src) : undefined;
  }
  return escapeHtml(value);
}

/**
 * Keep a small allowlist of formatting tags and escape everything else, so a
 * stored rich-text value cannot inject script, event handlers or unsafe URLs.
 */
export function sanitizeRichTextHtml(value: unknown): string {
  const source = toSafeText(value)
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/giu, '');

  let output = '';
  let cursor = 0;
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)\/?>/gu;

  for (const match of source.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    output += escapeHtml(source.slice(cursor, index));
    cursor = index + match[0].length;

    const tag = (match[1] ?? '').toLowerCase();
    const closing = match[0].startsWith('</');
    const allowedAttributes = ALLOWED_TAGS[tag];
    if (!allowedAttributes) continue;

    if (closing) {
      if (!VOID_TAGS.has(tag)) output += `</${tag}>`;
      continue;
    }

    const attributes: string[] = [];
    for (const attribute of (match[2] ?? '').matchAll(ATTRIBUTE)) {
      const name = (attribute[1] ?? '').toLowerCase();
      if (!allowedAttributes.includes(name)) continue;
      const raw = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
      const safeValue = safeAttributeValue(tag, name, raw);
      if (safeValue === undefined) continue;
      attributes.push(`${name}="${safeValue}"`);
    }
    if (tag === 'a' && attributes.some((attribute) => attribute.startsWith('href='))) {
      attributes.push('rel="noreferrer"');
    }
    const rendered = attributes.length > 0 ? `<${tag} ${attributes.join(' ')}` : `<${tag}`;
    output += VOID_TAGS.has(tag) ? `${rendered} />` : `${rendered}>`;
  }

  output += escapeHtml(source.slice(cursor));
  return output.trim();
}

/** Pick the renderer for a field: rich HTML values pass through the allowlist. */
export function renderRichContent(value: unknown): string {
  const text = toSafeText(value);
  if (text.trim() === '') return '';
  return /<\/?[a-zA-Z][a-zA-Z0-9-]*[\s/>]/u.test(text)
    ? sanitizeRichTextHtml(text)
    : renderMarkdown(text);
}