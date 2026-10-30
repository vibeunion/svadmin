---
title: Rich Content Rendering
description: How the Lite Markdown and rich text fields render stored content on the server
---

`MarkdownField` and `RichTextField` render stored content during SSR. There is no
client editor, no hydration step and no sanitizer dependency: the value is escaped
first, then only a fixed Markdown subset or a fixed HTML allowlist is rebuilt.

## Which renderer runs

| Stored value looks like | Renderer | Field |
| --- | --- | --- |
| plain text or Markdown (`# Title`, `- item`, `**bold**`) | Markdown renderer | both |
| HTML (`<p>…`, `<strong>…`) | allowlist sanitizer | `RichTextField` show/edit preview |

A value that contains HTML-shaped tags goes through the sanitizer; everything else
goes through the Markdown renderer. Hosts can therefore store either shape.

## Supported Markdown

| Syntax | Output |
| --- | --- |
| `# H1` … `###### H6` | `<h1>`…`<h6>` |
| `**bold**`, `__bold__`, `*italic*`, `_italic_`, `~~strike~~` | `<strong>`, `<em>`, `<s>` |
| `` `code` `` | `<code>` |
| fenced blocks with ```` ```lang ```` | `<pre><code class="language-lang">` |
| `- item`, `* item`, `1. item` | `<ul>` / `<ol>` |
| `- [x] done`, `- [ ] todo` | task list with disabled checkboxes |
| `> quote` | `<blockquote>` |
| `---`, `***`, `___` | `<hr />` |
| `| a | b |` with a separator row | `<table>` with `align` attributes |
| `[label](https://…)`, `[label](/path)` | `<a rel="noreferrer">` |

Anything else stays literal text. Unsupported syntax is never silently dropped, so
a table written without a separator row still shows its source instead of
disappearing.

## Rich HTML allowlist

Only these tags survive `RichTextField` rendering:

```
p strong b em i u s br hr ul ol li blockquote code pre h1 h2 h3 h4 h5 h6
a[href|title] img[src|alt|title] table thead tbody tfoot tr th[align] td[align]
input[type=checkbox][checked|disabled]
```

Everything else is removed while its text content is kept:

- `script`, `style`, `iframe`, `object`, `embed` blocks are deleted with their
  content,
- event handlers (`onclick`, `onerror`, …) are never copied,
- other form controls (`input[type=text]` and friends) are dropped,
- unknown tags are unwrapped, not rendered.

## Link and image policy

Every `href` and `src` is normalized through the same guard used by the rest of
Lite (`toSafeHref`):

- allowed: `http`, `https`, `mailto`, `tel`, and relative references,
- rejected: `javascript:`, `data:`, and anything carrying control or invisible
  characters,
- rejected attributes disappear entirely, leaving the link label or image alt text,
- rendered links always carry `rel="noreferrer"`.

## Editing surface

Both fields keep a native `textarea` for source editing and show the
server-rendered preview below it, so a no-JavaScript page can read the formatted
content and still submit changes.

There is no toolbar, no WYSIWYG selection model and no client sanitizer. That is a
deliberate boundary: the decision record lives in
`docs/architecture/ssr-rich-content-boundaries.md` in the repository.

## SSR guarantees

- The renderer is pure: no DOM, no `window`, no timers, so output is identical in
  SSR and in tests.
- Rendered markup is IE11-safe: plain HTML tags, no `display: grid`, no CSS
  custom properties in the preview styles.
- The Lite IE11 contract test scans every component for unsupported CSS, so the
  preview styles are covered by the same gate.

## Tests

| Contract | Test |
| --- | --- |
| Markdown subset, tables, task lists, escaping, link policy | `packages/lite/src/components/fields/rich-content.test.svelte.ts` |
| Field rendering in show/edit mode | `packages/lite/src/components/fields/LiteFields.test.svelte.ts` |
| Rich text never yields live script or handlers | `packages/lite/src/security.test.integration.ts` |