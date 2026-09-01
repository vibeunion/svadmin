# @svadmin/ai-elements

Composable AI interaction components for Svelte 5 and SVAdmin. The package uses runes, snippets, and structured message parts instead of a single string-only chat component.

## Install

```bash
bun add @svadmin/ai-elements @svadmin/core @sinclair/typebox @tanstack/svelte-query svelte
```

Import the package stylesheet once in your application CSS:

```css
@import '@svadmin/ai-elements/ai.css';
```

## Vite SSR

Vite SSR consumers must bundle the Svelte and ESM dependency boundary used by the complete package entry:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    noExternal: [
      '@tanstack/svelte-query',
      '@xyflow/svelte',
      '@xyflow/system',
      'katex',
      'streamdown-svelte',
    ],
  },
});
```

The packed-package verification loads the root entry through `vite.ssrLoadModule` and renders representative components with `svelte/server` using this exact boundary.

## Core Components

- `Conversation`, `Message`, `Response`, and `PromptInput`
- `Reasoning`, `Tool`, `Sources`, and `InlineCitation`
- `ChatDialog`, `CopilotPanel`, `AICommandBar`, `InsightCard`, `SmartSuggest`, and `VoiceInput`

## Agent Components

- Chat and workflow: `ChainOfThought`, `Checkpoint`, `Confirmation`, `Plan`, `Question`, `Queue`, `Shimmer`, `Suggestion`, and `Task`
- Context and output: `Attachments`, `ModelSelector`, `Context`, `Artifact`, `Image`, `OpenIn`, and `WebPreview`
- Developer output: `Agent`, `CodeBlock`, `Commit`, `EnvironmentVariables`, `FileTree`, `JSXPreview`, `PackageInfo`, `Sandbox`, `SchemaDisplay`, `Snippet`, `StackTrace`, `Terminal`, and `TestResults`
- Voice: `AudioPlayer`, `MicSelector`, `Persona`, `SpeechInput`, `Transcription`, and `VoiceSelector`
- Utilities: `CopyButton`, `Loader`, `ContextIcon`, `TokensWithCost`, `ToolStatusBadge`, and `PromptInputSpeechButton`
- Workflow canvas: `Canvas`, `Connection`, `Controls`, `Edge`, `Node`, `Panel`, and `Toolbar`

## Example

```svelte
<script lang="ts">
  import {
    Conversation,
    Message,
    MessageContent,
    MessageResponse,
    messageText,
    PromptInput,
  } from '@svadmin/ai-elements';

  let prompt = $state('');
  const message = {
    id: 'welcome',
    role: 'assistant' as const,
    parts: [{ type: 'text' as const, text: 'How can I help?' }],
    status: 'complete' as const,
    createdAt: Date.now(),
  };
</script>

<Conversation>
  <Message from={message.role} data-message-id={message.id}>
    <MessageContent>
      <MessageResponse content={messageText(message)} />
    </MessageContent>
  </Message>
</Conversation>

<PromptInput bind:value={prompt} />
```

Messages use the `ChatMessagePart` contract from `@svadmin/core`, including text, reasoning, tool calls/results, sources, images, files, approvals, and generated components.

Generated components use TypeBox as their runtime boundary. The schema also
drives the Svelte component prop type. Root object schemas are strict by
default, so undeclared model-provided props are rejected even when the caller
does not set `additionalProperties: false`:

```ts
import { Type } from '@sinclair/typebox';
import { defineGeneratedComponent } from '@svadmin/ai-elements';
import InventorySummary from './InventorySummary.svelte';

export const componentRegistry = {
  InventorySummary: defineGeneratedComponent({
    component: InventorySummary,
    schema: Type.Object({
      warehouse: Type.String(),
      count: Type.Number(),
    }),
  }),
};
```

Admin tools use the same TypeBox boundary. Call tools through
`executeAdminTool` so untrusted model arguments are decoded before the tool
implementation runs:

```ts
import { Type } from '@sinclair/typebox';
import { defineAdminTool, executeAdminTool } from '@svadmin/core';

const searchInventory = defineAdminTool({
  name: 'searchInventory',
  description: 'Search inventory by warehouse',
  parameters: Type.Object({
    warehouse: Type.String(),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  }),
  readOnly: true,
  execute: async ({ warehouse, limit }) => inventory.search({ warehouse, limit }),
});

await executeAdminTool(searchInventory, modelArguments);
```

## Upstream parity

`AI_ELEMENT_PARITY` pins the audited `vercel/ai-elements` commit and verifies
the 49-family, 398-export package surface. Export presence, behavior, and visual
fidelity are tracked independently: an exact export name is not proof of
interaction or pixel parity. `JSXPreview` intentionally uses a restricted,
TypeBox-validated parser instead of executing arbitrary JSX. `Tool.getStatusBadge`
returns Svelte-renderable status metadata instead of a React element.

## AdminApp Integration

Pass providers through the owning Svelte tree and render the assistant through
the `AdminApp` snippet:

```svelte
<AdminApp {dataProvider} {resources} {chatProvider}>
  {#snippet aiAssistant({ docked, scope, ownerScope })}
    <ChatDialog
      {docked}
      {scope}
      {ownerScope}
      persistKey={`user:${currentUser.id}:assistant`}
    />
  {/snippet}
</AdminApp>
```

History is in-memory by default. A non-empty `persistKey` enables
`localStorage`; include a stable, non-secret user identity in the key. Use
`onPersist` and `onRestore` for host-managed persistence. If restoration fails,
the dialog blocks writes for that history scope instead of overwriting remote
history; use `onPersistenceError` to report the failed operation.
