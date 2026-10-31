import { escapeHtml } from '@svadmin/lite';

/**
 * Example host-side highlighter for the Lite Markdown renderer.
 *
 * It runs on the server, is dependency-free and returns already-escaped HTML, so
 * it is safe to hand to `configureMarkdownRenderer({ highlight })` or to a
 * per-field `renderOptions` override. Swap it for Shiki/Prism output in a real
 * app; the contract is the same: return HTML or `undefined`.
 */

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'import', 'export', 'from', 'type', 'interface', 'async', 'await', 'new',
  'class', 'extends', 'implements', 'throw', 'try', 'catch', 'finally', 'true',
  'false', 'null', 'undefined', 'typeof', 'as', 'of', 'in',
]);

const SUPPORTED = new Set(['ts', 'tsx', 'js', 'jsx', 'json', 'svelte']);

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/gu;

export function highlightCode(code: string, language: string): string | undefined {
  if (!SUPPORTED.has(language)) return undefined;

  let output = '';
  let cursor = 0;

  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    output += escapeHtml(code.slice(cursor, index));
    const [token, comment, string, number, word] = match;

    if (comment) output += `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    else if (string) output += `<span class="tok-string">${escapeHtml(string)}</span>`;
    else if (number) output += `<span class="tok-number">${escapeHtml(number)}</span>`;
    else if (word) {
      output += KEYWORDS.has(word)
        ? `<span class="tok-keyword">${escapeHtml(word)}</span>`
        : escapeHtml(word);
    } else {
      output += escapeHtml(token ?? '');
    }

    cursor = index + (token ?? '').length;
  }

  output += escapeHtml(code.slice(cursor));
  return output;
}