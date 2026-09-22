---
title: Ecosystem coverage
description: Ant Design recommended libraries mapped to svadmin and the Svelte ecosystem
---

Ant Design publishes a [recommended library list](https://ant-design.antgroup.com/docs/react/recommendation-cn)
for the React ecosystem. This page maps every category to a svadmin package,
a Svelte-ecosystem alternative, or an explicit gap. A category is only marked
covered when the capability ships first-party or is provided by the framework
runtime itself.

Status legend: ✅ first-party · 🔶 partial or framework-provided · 🧩 delegated to a Svelte ecosystem package · ❌ first-party gap · ➖ not a fit for admin software.

| Category | Ant Design pick | svadmin surface | Svelte ecosystem | Status |
| --- | --- | --- | --- | --- |
| Charts | Ant Design Charts / AntV | `BarChart`, `LineChart`, `PieChart`, `AreaChart`, `ScatterChart` | LayerChart, svelte-echarts | 🔶 basic charts; statistical charts use LayerChart |
| Flow diagrams | reactflow | `@svadmin/flow` (xyflow/svelte) | @xyflow/svelte | ✅ |
| Hooks library | ahooks | `@svadmin/core` data/auth hooks + `@svadmin/ui` runes hooks: `useMediaQuery`, `useDeviceDetect`, `useClipboard`, `useLocalStorage`, `useDebouncedValue`, `useInterval`, `useEventListener`, `useOnClickOutside`, `useWindowSize` | runed | ✅ |
| Forms | ProForm / Formily / react-hook-form / Formik | `AutoForm`, `JsonSchemaForm`, `StepForm`, `ModalForm`, `DrawerForm`, field components | sveltekit-superforms | ✅ |
| Routing | react-router | `useParsed`, `NavigateToResource`, core router, SvelteKit adapter | SvelteKit | ✅ |
| Layout / dock | react-grid-layout, react-grid-system, rc-dock | `DraggableGrid`, `ResizableGrid`, `SplitPaneLayout`, `WorkspaceSplitPane`, `MultiTabKeepAlive` | paneforge, svelte-grid | 🔶 no dockable panels |
| Drag & drop | dnd-kit | `DraggableRowTable`, `DraggableHeader`, `DraggableGrid`, `KanbanBoard` | svelte-dnd-action | ✅ |
| Code editor | CodeMirror, Monaco | `CodeEditor` opt-in adapter (`@svadmin/ui/code-editor`) over `svelte-codemirror-editor` | svelte-codemirror-editor, svelte-monaco | ✅ |
| Rich text | react-quill | `@svadmin/editor` (Tiptap) | svelte-tiptap | ✅ |
| JSON editor | vanilla-jsoneditor | `JsonEditor` opt-in adapter (`@svadmin/ui/json-editor`) over `svelte-jsoneditor`; `JsonSchemaForm` for schema-driven forms | svelte-jsoneditor | ✅ |
| JSON viewer | react-json-view | `JsonField`, `CodeField` | — | ✅ |
| Color picker | react-colorful, react-color | `ColorPicker`, editor `ColorPicker` | — | ✅ |
| Responsive | react-responsive | `useMediaQuery`, `useDeviceDetect` | runed | ✅ |
| Clipboard | react-copy-to-clipboard | `CopyField`, ai-elements `CopyButton` | — | ✅ |
| Document meta | react-helmet-async | SvelteKit `<svelte:head>` | SvelteKit | 🔶 framework-provided |
| Icons | react-icons / fontawesome | `@lucide/svelte` | lucide-svelte, phosphor-svelte | ✅ |
| QR code | qrcode.react | `QRCode` opt-in adapter (`@svadmin/ui/qr-code`) over `qrcode` | svelte-qrcode, qrcode | ✅ |
| Top progress bar | nprogress | `TopProgressBar` | — | ✅ |
| i18n | FormatJS / react-i18next | `@svadmin/core` i18n, `useTranslation` | svelte-i18n, inlang | ✅ |
| Code highlighting | react-syntax-highlighter | ai-elements `CodeBlock` (Shiki), editor lowlight | shiki | ✅ |
| Markdown | react-markdown | ai-elements `Response` (marked/rehype) | mdsvex | ✅ |
| Infinite scroll | @rc-component/virtual-list, react-infinite-scroll-component | `InfiniteList`, `VirtualTable`, `scroll-area` primitive | @tanstack/svelte-virtual, virtua | ✅ |
| Maps | google-map-react, react-amap | — | @sveltejs/amp, leaflet | ➖ |
| Video player | react-player, video-react, video.js | `MediaPlayer` (native video/audio) | vidstack | 🔶 HLS/streaming via vidstack |
| Context menu | react-contexify | `context-menu` primitive | bits-ui | ✅ |
| Emoji | emoji-picker-react, emoji-mart | — | emoji-mart (framework-agnostic) | ➖ |
| Split panes | react-split-pane, react-resizable-panels | `SplitPaneLayout`, `WorkspaceSplitPane` | paneforge | ✅ |
| Image cropping | antd-img-crop, react-image-crop | `ImageCropper`, `MediaLibraryModal` | — | ✅ |
| Keyword highlight | react-highlight-words | `HighlightText` | — | ✅ |
| Text carousel | react-text-loop, react-fast-marquee | `Marquee` | — | ✅ |
| Animation | motion, Ant Motion, react-spring | Svelte transitions + `tweened` / `spring` | Svelte runtime, motion-svelte | 🔶 framework-provided |
| Footer | rc-footer | `AppFooter` | — | ✅ |
| Number / currency | react-number-format, react-currency-input-field | `NumberInput`, `NumericInput`, `MoneyInput`, `CurrencyField`, `PercentInput` | — | ✅ |
| Device detection | react-device-detect | `useDeviceDetect` | — | ✅ |
| App framework | umi, remix, refine | svadmin itself, `@svadmin/refine-adapter` | SvelteKit | ✅ |
| Phone input | react-phone-number-input | `PhoneField` (display), `PhoneInput` (input) | svelte-tel-input | ✅ |
| AI chat | Ant Design X | `@svadmin/ai-elements` | — | ✅ |
| CLI | Ant Design CLI | `create-svadmin`, `agmesh` | — | ✅ |
| PDF | react-pdf, @react-pdf/renderer | `PdfDocumentViewer` | pdfjs-dist, svelte-pdf | ✅ |
| Gestures | use-gesture | `useSwipe` (pointer-based) | svelte-gestures | ✅ simple swipes; complex gestures via svelte-gestures |

## Reading the table

- **✅ first-party** means the capability ships inside a `@svadmin/*` package
  with the same tenant, permission, and accessibility contracts as the rest of
  the framework.
- **🔶 partial or framework-provided** means svadmin covers the common admin
  case, while an advanced or specialized variant belongs in the Svelte
  ecosystem. The table names the package to reach for.
- **🧩 delegated** means the capability is deliberately provided by a Svelte
  ecosystem package. svadmin keeps the integration seam (tenant, permission,
  redaction) and does not re-export or vendor the dependency.
- **❌ first-party gap** means there is no component and no delegated package
  yet. This list is empty for the catalog above.
- **➖ not a fit** means the category is outside the admin framework's
  product boundary. It is documented so the decision is explicit, not an
  oversight.

## Delegated to the Svelte ecosystem

These categories are intentionally **not** implemented first-party. They are
specialized, dependency-heavy, or outside the admin product boundary, so the
project points at a maintained Svelte package instead of shipping a wrapper.
Treat the package name as the integration seam; keep tenant, permission, and
redaction decisions in svadmin code.

| Need | Svelte package | Notes |
| --- | --- | --- |
| Statistical charts | `layerchart`, `svelte-echarts` | Keep `BarChart`/`LineChart`/`PieChart` for dashboard basics |
| Dockable panels | `paneforge` | `ResizableGrid`, `SplitPaneLayout`, and `WorkspaceSplitPane` cover grid and split layouts |
| Virtual lists | `@tanstack/svelte-virtual`, `virtua` | `InfiniteList` and `VirtualTable` cover first-party needs |
| Streaming video | `vidstack` | `MediaPlayer` handles native video/audio only |
| Complex gestures | `svelte-gestures` | Simple swipe/pinch can stay on pointer events |
| Emoji picker | `emoji-mart` + `@emoji-mart/data` | Optional; kept out of the default surface |
| Maps | `leaflet` + `svelte-leafletjs` | Only if the product needs geo views |

Install example:

```bash
bun add layerchart
```

```svelte
<script lang="ts">
  import { Chart, Svg, Axis, Bars } from 'layerchart';
</script>
```

Do not vendor these packages into `@svadmin/ui`. Keeping them external
preserves the framework's dependency boundary and lets applications pin their
own versions. Where a thin adapter exists instead — `@svadmin/ui/code-editor`
and `@svadmin/ui/qr-code` — see [Ecosystem adapters](/components/ecosystem-adapters/).

## Deciding where a new capability lives

Add a first-party component to `@svadmin/ui` only when the capability is core
to admin work, dependency-light, and needs to share svadmin's tenant,
permission, and accessibility contracts. Such a component must:

1. use semantic design tokens instead of hardcoded colors;
2. be keyboard and screen-reader accessible;
3. keep network, permission, and persistence behind host-provided props;
4. ship colocated tests and an export from `@svadmin/ui`.

Otherwise delegate to the Svelte ecosystem package listed above and keep only
the integration seam in application code. Never vendor a delegated package into
`@svadmin/ui`.

The existing `HighlightText`, `Marquee`, `MediaPlayer`, `TopProgressBar`,
`PhoneInput`, `AppFooter`, `ResizableGrid`, `AreaChart`, `ScatterChart`,
`useMediaQuery` / `useDeviceDetect`, and the `useClipboard` / `useLocalStorage`
/ `useDebouncedValue` / `useInterval` / `useEventListener` / `useOnClickOutside`
/ `useWindowSize` / `useSwipe` browser hooks are examples of the first-party
path. `CodeEditor` (with `@svadmin/ui/code-editor/presets`), `JsonEditor`, and
`QRCode` are opt-in adapters over ecosystem packages, documented in
[Ecosystem adapters](/components/ecosystem-adapters/).