# Upstream architecture and parity assessment

This package is evaluated against fixed source snapshots so that component
counts and behavior claims remain reproducible:

- `vercel/ai-elements` at `6a9d5b1822ffb10bba4bd97175f01edd7d8651cd`
- `vuepont/ai-elements-vue` at `ad4818f6081a2fe6e5b7bb53cebc5a66d9a24148`
- `SikandarJODD/ai-elements` at `fa4bc217f84bc571378bc371332a154106772614`

## Architecture decision

SVAdmin keeps its package-first architecture instead of copying the reference
applications wholesale. The current structure is stronger for an admin
framework because it provides:

- Svelte 5 runes, snippets, bindable state, and scoped context instead of React
  compatibility wrappers;
- structured `ChatMessagePart` data for text, reasoning, tools, sources,
  attachments, approvals, and generated components;
- TypeBox runtime boundaries for generated component props and agent tool
  arguments;
- SSR, package-export, packed-consumer, and workspace integration gates;
- semantic design tokens and tenant/provider ownership inherited from SVAdmin.

The Sikandar project is stronger as a component-learning reference. Its
co-located examples, registry organization, concise component files, and
Svelte-native compound APIs make individual components easy to inspect. We
adopted the useful parts without importing its application routing or registry
runtime into the package:

- generic `Action` and `Code` families;
- message and prompt attachment composition;
- workflow subpath aggregation;
- small compound component files and Svelte context APIs;
- explicit `content` props for Markdown responses rather than attempting to
  recover text from compiled Svelte snippets.

## Component inventory

The pinned official package exposes 49 component families and 398 runtime
exports. `vuepont/ai-elements-vue` exposes 48 comparable families. The Sikandar
documentation registry lists a smaller application-focused set, while SVAdmin
also includes admin-specific chat surfaces such as `ChatDialog`,
`CopilotPanel`, `AICommandBar`, `InsightCard`, `SmartSuggest`, and `VoiceInput`.

`AI_ELEMENT_PARITY` is the authoritative machine-readable inventory. Every
official runtime export is mapped to a local Svelte export. Behavior status is
tracked separately and must name an existing test file before a family can be
classified as verified. This prevents an export-only audit from being reported
as functional parity.

## Intentional framework differences

Two official helpers intentionally differ while preserving the user-facing
capability:

- `JSXPreview` parses a restricted, TypeBox-validated component grammar rather
  than executing arbitrary JSX.
- `Tool.getStatusBadge` returns Svelte-renderable status metadata rather than a
  React element.

`MessageResponse` accepts Markdown through `content` or `text`. Plain Svelte
children remain snippets and are rendered as authored UI; they are not mounted
into a hidden DOM node and scraped back into a string. This matches the
Sikandar Svelte implementation and preserves SSR and streaming reactivity.

Visual evidence remains independent from behavior evidence. A component can
be behavior-verified without claiming pixel identity across React, Vue, and
Svelte rendering stacks.
