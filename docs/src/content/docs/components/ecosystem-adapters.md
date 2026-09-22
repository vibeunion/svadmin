---
title: Ecosystem adapters
description: Opt-in adapters over Svelte ecosystem packages
---

Some capabilities are best owned by the Svelte ecosystem, but still deserve a
consistent svadmin surface. These **opt-in adapters** wrap the ecosystem package
under the svadmin accessibility and design-token contract. They are exported
from dedicated subpaths so the default `@svadmin/ui` entry stays
dependency-free, and `create-svadmin` advertises them in the generated
`svadmin.ai.json` component catalog.

| Adapter | Subpath | Ecosystem package |
| --- | --- | --- |
| `CodeEditor` | `@svadmin/ui/code-editor` | `svelte-codemirror-editor` + `codemirror` |
| CodeMirror language presets | `@svadmin/ui/code-editor/presets` | `@codemirror/lang-json`, `@codemirror/lang-javascript`, `@codemirror/lang-sql`, `@codemirror/lang-markdown` |
| `JsonEditor` | `@svadmin/ui/json-editor` | `svelte-jsoneditor` |
| `QRCode` | `@svadmin/ui/qr-code` | `qrcode` |

## Install only what you import

The ecosystem packages are declared as **optional peer dependencies**:

```bash
# Code editor
bun add svelte-codemirror-editor codemirror

# Code editor language presets
bun add @codemirror/lang-json

# JSON editor
bun add svelte-jsoneditor

# QR code
bun add qrcode
```

## CodeEditor

`CodeEditor` dynamically loads `svelte-codemirror-editor` on mount. Until the
module is ready — or if it is not installed — it renders an accessible
`<textarea>` fallback, so a form never becomes unusable.

```svelte
<script lang="ts">
  import CodeEditor from '@svadmin/ui/code-editor';
  import { json } from '@codemirror/lang-json';

  let value = $state('{ "warehouse": "north" }');
</script>

<CodeEditor bind:value lang={json()} lineNumbers lineWrapping ariaLabel="Query editor" />
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `string` (bindable) | `''` | Editor contents |
| `lang` | CodeMirror `LanguageSupport` | — | Pass your own language extension |
| `theme` | CodeMirror `Extension` | — | Editor theme |
| `extensions` | `Extension[]` | — | Additional extensions/keymaps |
| `placeholder` | `string` | `Write code…` | Empty-state text |
| `editable` / `readonly` | `boolean` | `true` / `false` | Edit gating |
| `lineNumbers` / `lineWrapping` | `boolean` | `true` | Editor chrome |
| `tabSize` | `number` | `2` | Indentation width |
| `ariaLabel` | `string` | `Code editor` | Fallback textarea label |
| `onchange` | `(value: string) => void` | — | Fired on edit |
| `onready` | `(view) => void` | — | Receives the CodeMirror `EditorView` |

Keep language and theme extensions in the application. Do not import every
language pack from the adapter — that would defeat the optional dependency.

### Language presets

`@svadmin/ui/code-editor/presets` re-exports ready-to-use CodeMirror language
supports. Install only the languages you import:

```svelte
<script lang="ts">
  import CodeEditor from '@svadmin/ui/code-editor';
  import { json } from '@svadmin/ui/code-editor/presets';

  let value = $state('{ "warehouse": "north" }');
</script>

<CodeEditor bind:value lang={json()} lineNumbers />
```

Available presets: `json`, `javascript` (pass `{ typescript: true }` for TS),
`sql`, and `markdown`, plus the raw `javascriptLanguage`, `typescriptLanguage`,
`jsxLanguage`, and `tsxLanguage` language objects.

## JsonEditor

`JsonEditor` dynamically loads `svelte-jsoneditor` on mount. Until the module is
ready — or if it is not installed — it renders a validating `<textarea>`
fallback that reports parse errors through `onerror`.

```svelte
<script lang="ts">
  import JsonEditor from '@svadmin/ui/json-editor';

  let payload = $state({ warehouse: 'north', count: 12 });
</script>

<JsonEditor bind:value={payload} mode="tree" height="24rem" ariaLabel="Payload" />
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `unknown` (bindable) | `undefined` | Parsed JSON value |
| `mode` | `'tree' \| 'text' \| 'table'` | `'tree'` | Editor mode |
| `readonly` | `boolean` | `false` | Hides the menu/navigation bars when set |
| `height` | `string` | `22rem` | Editor surface height |
| `ariaLabel` | `string` | `JSON editor` | Accessible name |
| `onchange` | `(value: unknown) => void` | — | Parsed value on change |
| `onerror` | `(message: string) => void` | — | Fallback parse errors |

The package ships its base styles with the component. For dark mode, import
`svelte-jsoneditor/themes/jse-theme-dark.css` in the application entry.

## QRCode

`QRCode` renders a crisp SVG from `qrcode` without a canvas, so it works during
SSR and in test DOMs. Colors default to semantic tokens, and a quiet-zone margin
is applied for reliable scanning.

```svelte
<script lang="ts">
  import QRCode from '@svadmin/ui/qr-code';

  const enrolmentUri = 'otpauth://totp/SVAdmin?secret=…';
</script>

<QRCode value={enrolmentUri} size={180} ariaLabel="Scan to enrol" />
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `string` | — | Content to encode; empty renders a placeholder |
| `size` | `number` | `160` | Rendered size in pixels |
| `margin` | `number` | `4` | Quiet-zone width in modules; keep ≥ 4 |
| `errorCorrectionLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` | Higher recovers more damage but increases density |
| `color` / `background` | `string` | `var(--foreground…)` / `var(--background…)` | Module and background colors |
| `ariaLabel` | `string` | `QR code` | Accessible name; do not include secrets |

Treat enrolment URIs and tokens as sensitive: pass them through props, never
into logs, analytics, or the accessible name.

## Boundaries

Adapters exist only where a thin, stable wrapper adds value. Everything else is
pointed at directly and never vendored — see
[Ecosystem coverage](/guides/ecosystem-coverage/).