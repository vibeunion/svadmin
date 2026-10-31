/**
 * Server-side rich content rendering for `@svadmin/lite`.
 *
 * Both helpers build HTML from untrusted strings, so every literal character is
 * escaped first and only a fixed tag/attribute allowlist survives. The output is
 * meant to be rendered with `{@html ...}` inside SSR markup — no client script,
 * no DOM, no sanitizer dependency.
 */
import { toSafeHref, toSafeText } from './security';

export interface MarkdownRenderOptions {
  /**
   * Trusted server-side highlighter. It receives the raw code and the fenced
   * language and must return ready-to-render HTML (for example from Shiki or
   * Prism running on the server). Returning `undefined` keeps the escaped
   * plain-text block. The result is inserted as-is, so never forward user input
   * into a highlighter that echoes unescaped markup.
   */
  highlight?: (code: string, language: string) => string | undefined;
  /** Extra class names applied to every fenced `<pre>`. */
  codeBlockClass?: string;
}

let configuredMarkdownOptions: MarkdownRenderOptions = {};

/**
 * Register app-wide Markdown rendering options (for example a server-side
 * highlighter). Returns the previous options so tests and hosts can restore them.
 */
export function configureMarkdownRenderer(options: MarkdownRenderOptions): MarkdownRenderOptions {
  const previous = configuredMarkdownOptions;
  configuredMarkdownOptions = { ...options };
  return previous;
}

function resolveOptions(options?: MarkdownRenderOptions): MarkdownRenderOptions {
  return options ? { ...configuredMarkdownOptions, ...options } : configuredMarkdownOptions;
}

function classAttribute(...values: Array<string | undefined>): string {
  const classes = values.filter((value): value is string => Boolean(value && value.trim()));
  return classes.length > 0 ? ` class="${escapeHtml(classes.join(' '))}"` : '';
}

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
const FOOTNOTE_REF = /\[\^([^\]\s]+)\]/u;

export interface FootnoteContext {
  /** Footnote label to 1-based number. */
  numbers: Map<string, number>;
  /** How many times each number has been referenced, for unique ids. */
  refs: Map<number, number>;
}

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
function renderFootnoteRef(label: string, footnotes?: FootnoteContext): string | undefined {
  const number = footnotes?.numbers.get(label);
  if (!footnotes || number === undefined) return undefined;
  const seen = (footnotes.refs.get(number) ?? 0) + 1;
  footnotes.refs.set(number, seen);
  const id = seen === 1 ? `fnref-${number}` : `fnref-${number}-${seen}`;
  return `<sup class="lite-footnote-ref"><a href="#fn-${number}" id="${id}">${number}</a></sup>`;
}

export function renderInlineMarkdown(source: string, footnotes?: FootnoteContext): string {
  let rest = source;
  let output = '';

  while (rest.length > 0) {
    const code = INLINE_CODE.exec(rest);
    const link = LINK.exec(rest);
    const footnote = FOOTNOTE_REF.exec(rest);
    const next = [code, link, footnote]
      .filter((match): match is RegExpExecArray => match !== null)
      .sort((a, b) => a.index - b.index)[0];

    if (!next) {
      output += emphasize(escapeHtml(rest));
      break;
    }

    output += emphasize(escapeHtml(rest.slice(0, next.index)));

    if (next === code) {
      output += `<code>${escapeHtml(next[1] ?? '')}</code>`;
    } else if (next === footnote) {
      const reference = renderFootnoteRef(next[1] ?? '', footnotes);
      output += reference ?? escapeHtml(next[0]);
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

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)+\|?\s*$/u;
const FOOTNOTE_DEFINITION = /^\s*\[\^([^\]\s]+)\]:\s*(.+)$/u;
const DEFINITION_LINE = /^\s*:\s+(.+)$/u;
const TASK_ITEM = /^\s*\[( |x|X)\]\s+(.*)$/u;

function splitTableRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  for (const character of row) {
    if (character === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  cells.push(current.trim());
  return cells;
}

function tableAlignment(cell: string): 'left' | 'center' | 'right' | undefined {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return undefined;
}

function renderTable(
  header: string[],
  alignments: Array<string | undefined>,
  rows: string[][],
): string {
  const attribute = (index: number): string => {
    const align = alignments[index];
    return align ? ` align="${align}"` : '';
  };
  const head = header
    .map((cell, index) => `<th${attribute(index)}>${renderInlineMarkdown(cell)}</th>`)
    .join('');
  const body = rows
    .map((row) => {
      const cells = header.map((_, index) => `<td${attribute(index)}>${renderInlineMarkdown(row[index] ?? '')}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
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
export function renderMarkdown(value: unknown, options?: MarkdownRenderOptions): string {
  const source = toSafeText(value).replace(/\r\n?/gu, '\n');
  if (source.trim() === '') return '';
  const renderOptions = resolveOptions(options);

  const lines = source.split('\n');

  // Footnote definitions are lifted out of the body and rendered as a list.
  const definitions = new Map<string, string>();
  const numbers = new Map<string, number>();
  const footnotes: FootnoteContext = { numbers, refs: new Map() };
  const bodyLines: string[] = [];
  for (const line of lines) {
    const definition = FOOTNOTE_DEFINITION.exec(line);
    if (!definition?.[1] || definition[2] === undefined) {
      bodyLines.push(line);
      continue;
    }
    if (!definitions.has(definition[1])) {
      definitions.set(definition[1], definition[2].trim());
      numbers.set(definition[1], definitions.size);
    }
  }

  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.map((line) => renderInlineMarkdown(line, footnotes)).join('<br />')}</p>`);
    paragraph = [];
  };

  const content = bodyLines;
  for (let index = 0; index < content.length; index += 1) {
    const line = content[index] ?? '';

    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      let cursor = index + 1;
      while (cursor < content.length && !FENCE.test(content[cursor] ?? '')) {
        code.push(content[cursor] ?? '');
        cursor += 1;
      }
      index = cursor;
      const language = fence[1] ?? '';
      const highlighted = language && renderOptions.highlight
        ? renderOptions.highlight(code.join('\n'), language)
        : undefined;
      const languageClass = language ? `language-${language}` : undefined;
      const preClass = classAttribute(renderOptions.codeBlockClass);
      const codeClass = classAttribute(languageClass);
      blocks.push(
        highlighted === undefined
          ? `<pre${preClass}><code${codeClass}>${escapeHtml(code.join('\n'))}</code></pre>`
          : `<pre${preClass}><code${codeClass}>${highlighted}</code></pre>`,
      );
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
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2] ?? '', footnotes)}</h${level}>`);
      continue;
    }

    if (line.includes('|') && TABLE_SEPARATOR.test(content[index + 1] ?? '')) {
      flush();
      const header = splitTableRow(line);
      const alignments = splitTableRow(content[index + 1] ?? '').map(tableAlignment);
      const rows: string[][] = [];
      let cursor = index + 2;
      while (cursor < content.length) {
        const candidate = content[cursor] ?? '';
        if (candidate.trim() === '' || !candidate.includes('|')) break;
        rows.push(splitTableRow(candidate));
        cursor += 1;
      }
      index = cursor - 1;
      blocks.push(renderTable(header, alignments, rows));
      continue;
    }

    if (UNORDERED.test(line) || ORDERED.test(line)) {
      flush();
      const ordered = ORDERED.test(line);
      const pattern = ordered ? ORDERED : UNORDERED;
      const items: string[] = [];
      let hasTask = false;
      let cursor = index;
      while (cursor < content.length) {
        const item = pattern.exec(content[cursor] ?? '');
        if (!item) break;
        const itemContent = item[1] ?? '';
        const task = ordered ? null : TASK_ITEM.exec(itemContent);
        if (task) {
          hasTask = true;
          const checked = task[1] !== ' ';
          items.push(`<li class="lite-task-item"><input type="checkbox" disabled${checked ? ' checked' : ''} /> ${renderInlineMarkdown(task[2] ?? '', footnotes)}</li>`);
        } else {
          items.push(`<li>${renderInlineMarkdown(itemContent, footnotes)}</li>`);
        }
        cursor += 1;
      }
      index = cursor - 1;
      const listClass = hasTask ? ' class="lite-task-list"' : '';
      blocks.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul${listClass}>${items.join('')}</ul>`);
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flush();
      const quoted: string[] = [];
      let cursor = index;
      while (cursor < content.length) {
        const inner = QUOTE.exec(content[cursor] ?? '');
        if (!inner) break;
        quoted.push(inner[1] ?? '');
        cursor += 1;
      }
      index = cursor - 1;
      blocks.push(`<blockquote><p>${quoted.map((line) => renderInlineMarkdown(line, footnotes)).join('<br />')}</p></blockquote>`);
      continue;
    }

    const definition = DEFINITION_LINE.exec(content[index + 1] ?? '');
    if (definition) {
      flush();
      const terms: string[] = [];
      let cursor = index;
      while (cursor < content.length) {
        const term = (content[cursor] ?? '').trim();
        const description = DEFINITION_LINE.exec(content[cursor + 1] ?? '');
        if (!term || !description?.[1]) break;
        terms.push(
          `<dt>${renderInlineMarkdown(term, footnotes)}</dt><dd>${renderInlineMarkdown(description[1], footnotes)}</dd>`,
        );
        cursor += 2;
      }
      index = cursor - 1;
      blocks.push(`<dl>${terms.join('')}</dl>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();

  if (definitions.size > 0) {
    const items = [...definitions.entries()]
      .map(([label, text], index) => {
        const number = numbers.get(label) ?? index + 1;
        const backlinks = Math.max(1, footnotes.refs.get(number) ?? 0);
        const links = Array.from({ length: backlinks }, (_, refIndex) => {
          const id = refIndex === 0 ? `fnref-${number}` : `fnref-${number}-${refIndex + 1}`;
          return `<a href="#${id}" class="lite-footnote-backlink" aria-label="Back to reference">↩</a>`;
        }).join(' ');
        return `<li id="fn-${number}">${renderInlineMarkdown(text, footnotes)} ${links}</li>`;
      })
      .join('');
    blocks.push(`<section class="lite-footnotes"><hr /><ol>${items}</ol></section>`);
  }

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
  table: [],
  thead: [],
  tbody: [],
  tfoot: [],
  tr: [],
  th: ['align'],
  td: ['align'],
  input: ['type', 'checked', 'disabled'],
  sup: [],
  dl: [],
  dt: [],
  dd: [],
};

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input']);
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
    const isCheckbox = tag === 'input' && /type\s*=\s*["']?checkbox/iu.test(match[2] ?? '');
    if ((tag === 'input' && !isCheckbox) || (tag === 'input' && closing)) continue;
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
    if (tag === 'input') {
      // Boolean attributes carry no value, so they cannot come from ATTRIBUTE.
      const raw = match[2] ?? '';
      if (/\bchecked\b/iu.test(raw)) attributes.push('checked');
      if (/\bdisabled\b/iu.test(raw)) attributes.push('disabled');
    }
    const rendered = attributes.length > 0 ? `<${tag} ${attributes.join(' ')}` : `<${tag}`;
    output += VOID_TAGS.has(tag) ? `${rendered} />` : `${rendered}>`;
  }

  output += escapeHtml(source.slice(cursor));
  return output.trim();
}

/** Pick the renderer for a field: rich HTML values pass through the allowlist. */
export function renderRichContent(value: unknown, options?: MarkdownRenderOptions): string {
  const text = toSafeText(value);
  if (text.trim() === '') return '';
  return /<\/?[a-zA-Z][a-zA-Z0-9-]*[\s/>]/u.test(text)
    ? sanitizeRichTextHtml(text)
    : renderMarkdown(text, options);
}