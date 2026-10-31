# SSR Rich Content and Interactive Field Boundaries

Status: accepted (2026-10-30)
Scope: `MarkdownField`, `RichTextField`, `AutoComplete`, `RelationPicker`,
`SignaturePad` in `@svadmin/lite`
Related: [field parity criteria](./lite-field-parity-criteria.md)

## Decisions

### 1. MarkdownField — upgrade to `exact`

Lite now renders Markdown on the server (headings, lists, block quotes, fenced
code, emphasis, inline code, safe links, rules) and keeps the native `textarea`
for source editing. A preview is also rendered under the editor for the stored
value.

The reference editor adds a toolbar and split-pane scrolling. Both are client
enhancements over an editor that already produces the same stored text, so the
mapping satisfies the published criteria. Unsupported syntax stays literal text
rather than being dropped.

### 2. RichTextField — keep `fallback`, but render rich content safely

Plain-text (or Markdown-source) editing is **not** an acceptable substitute for
WYSIWYG editing. Formatting controls, selection-aware commands, paste cleanup and
inline media insertion are the reference capability; a textarea cannot reproduce
them without a client editor. The mapping therefore stays `fallback`.

What Lite does promise instead:

- read mode renders stored HTML through a fixed allowlist
  (`p`, `strong`, `b`, `em`, `i`, `u`, `s`, `br`, `hr`, `ul`, `ol`, `li`,
  `blockquote`, `code`, `pre`, `h1`–`h6`, `a[href]`, `img[src|alt]`),
- `script`/`style`/`iframe`/`object`/`embed` blocks are removed, event handlers
  are dropped and every href/src is passed through `toSafeHref` (http, https,
  mailto, tel, relative), with `rel="noreferrer"` added to links,
- Markdown-shaped values are rendered by the Markdown renderer, so a host can
  store either shape.

The WYSIWYG job belongs to the SPA: a Lite page that needs rich editing must link
to the SPA route instead of implying formatting support.

### 2b. Free-text display surfaces

`LiteInsightCard` renders pre-computed insight content through the same
Markdown/allowlist path: AI-generated text is Markdown-shaped in practice and the
card has no other way to present it in SSR.

`LiteCommentThread`, `LiteNotificationCenter` and `LiteActivityFeed` keep
text-only output by default and expose an opt-in `richContent` prop. Their
reference components render plain text, so rendering Markdown by default would be
a capability difference, not parity; hosts opt in per surface.

Markdown support now also covers pipe tables, task lists, footnotes, definition
lists, heading anchors, an opt-in `[toc]` and opt-in `externalLinks` (absolute
links get `target="_blank"` plus `rel="noopener noreferrer"`; relative, anchor,
`mailto:` and `tel:` links are untouched). Hosts can plug a trusted server-side
highlighter through `configureMarkdownRenderer` or per-field `renderOptions`. The
hook only receives fenced blocks and its HTML is inserted as-is, so it is a
documented trust boundary rather than a sanitizer.

Code-highlight token theming is split by baseline: `lite.css` stays IE11-safe with
literal `tok-*` colours, while the opt-in `lite-code-theme.css` drives the same
palette from `--lite-token-*` variables (with a `lite-dark` preset). The
sanitizer always adds `rel="noopener noreferrer"` to anchors in stored HTML.

### 3. AutoComplete — keep `fallback`

`datalist` gives native suggestions, but the reference capability is remote
querying plus a keyboard-driven popup. Both need client state that decides which
options exist, so the boundary is client-owned. Lite keeps the native input with
static options and the host owns querying.

### 4. RelationPicker — keep `fallback`

A relation field with a small static option set renders as a native `select` and
is fully usable. Searching, paginating and creating related records from the
picker are client-state capabilities; large relation sets must be narrowed
server-side before rendering.

### 5. SignaturePad — keep `fallback`

Canvas handwriting has no native form equivalent. Lite accepts an already-signed
image upload with a preview; drawing stays in the SPA.

## Non-goals

- No client-side Markdown editing toolbar in Lite.
- No WYSIWYG editor bundle in Lite (no Tiptap/ProseMirror in the SSR baseline).
- No HTML sanitizer dependency added to Lite; the allowlist above is the contract.
- No remote option loading inside Lite controls.

## Evidence

| Claim | Evidence |
| --- | --- |
| Markdown renders server-side and escapes raw HTML | `packages/lite/src/components/fields/rich-content.test.svelte.ts` |
| Rich HTML allowlist strips script/handlers/unsafe URLs | same file (`Lite rich text sanitizer`) |
| Fields render preview + editable source | `LiteFields.test.svelte.ts` (`Lite rich content fields`) |
| Insight card and opt-in comment rendering | `LiteDataDisplay.test.svelte.ts` (`Lite rich content display surfaces`) |
| Highlight hook stays opt-in and escapes by default | `rich-content.test.svelte.ts` (`Lite markdown highlighting hook`) |
| External links are opt-in and never rewrite relative/unsafe links | `rich-content.test.svelte.ts` (`Lite markdown external links`) |
| Token theme covers every surface and the dark preset every variable | `packages/lite/src/lite-code-theme.test.ts` |
| Docs demo renders the shared sample at build time | `docs/src/components/RichContentDemo.astro`, `bun run docs:build` |
| Mapping statuses follow the criteria | `scripts/parity-contract.test.ts` |

## Revisit triggers

1. Product decides rich formatting is required in the no-JS baseline (would need
   an SSR editor model, not a client toolbar).
2. A server-side relation search API makes remote option loading unnecessary.
3. Canvas signatures become a compliance requirement for the SSR pages.