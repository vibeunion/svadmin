# @svadmin/editor

Modern Tiptap-based rich text editor for Svelte 5 — headless, modular, production-ready

## Install

```bash
bun add @svadmin/editor
```

## Usage

```ts
<script lang="ts">
  import { Editor } from '@svadmin/editor';
  let content = $state('<p>Hello</p>');
</script>

<Editor bind:value={content} placeholder="Start writing..." />
```

Tiptap-based rich text editor for Svelte 5. Register it with `setRichTextEditor` from `@svadmin/ui` when using `richtext` fields.

Documentation: https://svadmin.nestjs.cn

License: MIT
