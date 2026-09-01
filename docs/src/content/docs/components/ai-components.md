---
title: AI UI Components
description: Pre-built, AI-centric components powered by ChatProvider for 10x faster Copilot integrations.
---

# AI Features

Headless Admin Svelte supports multiple high-level AI UI components out-of-the-box. These components utilize the core `ChatProvider` interface to instantly turn your admin dashboard into a smart, conversational copilot application.

AI components remain inside the current tenant, resource, permission, and audit
boundaries. Suggestions and read-only summaries must be visibly distinct from
actions that mutate data. Destructive, billing, permission, and bulk operations
always require explicit user confirmation, and server-side authorization remains
the source of truth.

## Prerequisites

Before using the AI components, pass a `ChatProvider` into the owning `AdminApp` tree:

```bash
bun add @svadmin/ai-elements @svadmin/core @sinclair/typebox @tanstack/svelte-query svelte
```

```svelte
<script lang="ts">
import { AdminApp } from '@svadmin/ui';
import { ChatDialog } from '@svadmin/ai-elements';

const chatProvider = {
  async *sendMessage(messages, options) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      signal: options?.signal,
    });
    if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text) yield text;
      }
      const tail = decoder.decode();
      if (tail) yield tail;
    } finally {
      reader.releaseLock();
    }
  },
};
</script>

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

`ChatDialog` keeps history in memory by default. A non-empty `persistKey` opts into
`localStorage`; include a stable, non-secret user identity in that key so accounts
sharing the same browser cannot restore each other's conversations. Use
`onPersist` and `onRestore` when the host owns server-side history. A restore
failure blocks subsequent writes for that history scope so an empty fallback
cannot overwrite remote history; handle the failure through `onPersistenceError`.

Import the component styles once in your application stylesheet:

```css
@import '@svadmin/ai-elements/ai.css';
```

For Vite SSR, bundle the package's Svelte and ESM dependency boundary:

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

## Composable message primitives

Use `Conversation`, `Message`, `Response`, and `PromptInput` for the main chat flow. Message bodies can compose `Reasoning`, `Tool`, `Sources`, and `InlineCitation` around structured `ChatMessagePart` values.

Additional agent surfaces are grouped by purpose:

- Chat and workflow: `ChainOfThought`, `Checkpoint`, `Confirmation`, `Plan`, `Question`, `Queue`, `Shimmer`, `Suggestion`, and `Task`
- Context and generated output: `Attachments`, `ModelSelector`, `Context`, `Artifact`, `Image`, `OpenIn`, and `WebPreview`
- Developer output: `Agent`, `CodeBlock`, `Commit`, `EnvironmentVariables`, `FileTree`, `JSXPreview`, `PackageInfo`, `Sandbox`, `SchemaDisplay`, `Snippet`, `StackTrace`, `Terminal`, and `TestResults`
- Voice: `AudioPlayer`, `MicSelector`, `Persona`, `SpeechInput`, `Transcription`, and `VoiceSelector`
- Workflow canvas: `Canvas`, `Connection`, `Controls`, `Edge`, `Node`, `Panel`, and `Toolbar`
- Utilities: `CopyButton`, `Loader`, `ContextIcon`, `TokensWithCost`, `ToolStatusBadge`, and `PromptInputSpeechButton`

Generated components are registered through a TypeBox schema. Model-provided
props are decoded before Svelte receives them. Root object schemas are strict by
default, so undeclared fields are rejected without requiring callers to repeat
`additionalProperties: false`:

```svelte
<script lang="ts">
  import { Type } from '@sinclair/typebox';
  import { ChatDialog, defineGeneratedComponent } from '@svadmin/ai-elements';
  import InventorySummary from './InventorySummary.svelte';

  const componentRegistry = {
    InventorySummary: defineGeneratedComponent({
      component: InventorySummary,
      schema: Type.Object({
        warehouse: Type.String(),
        count: Type.Integer({ minimum: 0 }),
      }),
    }),
  };
</script>

<ChatDialog {componentRegistry} />
```

The exported `AI_ELEMENT_PARITY` manifest separately tracks package-surface,
behavioral, and visual verification against its pinned upstream commit. An
exact export name does not by itself imply interaction or pixel parity.
`JSXPreview` uses a restricted TypeBox-validated parser, while
`Tool.getStatusBadge` returns metadata for Svelte rendering rather than a React
element; both are recorded as intentional behavioral differences.

---

## 1. ChatDialog (Floating Copilot)
A floating action button (FAB) that opens a rich chat window similar to Intercom or Microsoft Copilot. It supports:
- **Streaming Markdown** with syntax highlighting
- **Action Buttons** (AI can trigger UI actions)
- **Context Awareness** (automatically extracts current route, resource, and record ID)
- **Persistence** opt-in, user-isolated local history or host-owned callbacks

```svelte
<script>
  import { ChatDialog } from '@svadmin/ai-elements';
</script>

<!-- In-memory only unless persistKey/onPersist/onRestore is supplied. -->
<ChatDialog persistKey={`user:${currentUser.id}:assistant`} />
```

---

## 2. SmartSuggest (AI Autocomplete)
An unobtrusive input field that displays ghost text predicting what the user will type next, based on context and current input.

```svelte
<script>
  import { SmartSuggest } from '@svadmin/ai-elements';
  let title = $state('');
</script>

<SmartSuggest 
  bind:value={title} 
  context="Writing a product title for a blue cotton t-shirt" 
  placeholder="Product Name..." 
/>
```

---

## 3. AICommandBar (Natural Language Query)
Enhances the standard Command Palette (Ctrl+K) with an AI mode. If the user presses `Ctrl+Enter`, their query is sent to the AI instead of searching navigation routes.

```svelte
<script>
  import { AICommandBar } from '@svadmin/ai-elements';
  let open = $state(false);
</script>

<AICommandBar bind:open />
```

---

## 4. CopilotPanel (Context-Aware Assistant)
A right-side slide-out panel that automatically fetches smart insights specifically tailored for the page the admin is viewing.

```svelte
<script>
  import { CopilotPanel } from '@svadmin/ai-elements';
</script>

<!-- Pulls context automatically via getChatContext() -->
<CopilotPanel open={true} />
```

---

## 5. InsightCard (Dashboard Analytics)
A dashboard card widget that takes a raw data string (context) and generates an executive summary summary.

```svelte
<script>
  import { InsightCard } from '@svadmin/ai-elements';
</script>

<InsightCard 
  title="Weekly Revenue Insights"
  context="Revenue: $14,000. Top Category: Electronics (+12%). Returns: 4%."
/>
```

---

## 6. AnomalyBadge (Data Marker)
Highlights data deviations dynamically. Automatically colors green/red based on differences against your specified baseline.

```svelte
<script>
  import { AnomalyBadge } from '@svadmin/ui';
</script>

<!-- If 1500 deviates by >20% from 800, it renders as an anomaly badge -->
<AnomalyBadge 
  value={1500} 
  baseline={800} 
  threshold={0.2} 
/>
```

---

## 7. VoiceInput (Web Speech API)
A minimal toggle button that uses browser-native `SpeechRecognition` to transcribe voice to text.

```svelte
<script>
  import { VoiceInput } from '@svadmin/ai-elements';
  let speechText = $state('');
</script>

<VoiceInput onresult={(text) => speechText = text} />
```

---

## Response
The composable response renderer used by `ChatDialog` and `CopilotPanel`. It displays streaming text with a typing cursor and renders fenced code blocks.

```svelte
<script>
  import { Response } from '@svadmin/ai-elements';
</script>

<Response content="...markdown..." streaming={true} />
```
