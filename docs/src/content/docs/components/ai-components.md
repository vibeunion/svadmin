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

Before using the AI components, you must configure a `ChatProvider` in your application layout:

```ts
import { setChatProvider } from '@svadmin/core';

setChatProvider({
  async sendMessage(messages, options) {
    // Send to your AI backend (OpenAI, Anthropic, Ollama, etc.)
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages })
    });
    
    // Optionally return an AsyncIterable for streaming markdown!
    return response.body; 
  }
});
```

---

## 1. ChatDialog (Floating Copilot)
A floating action button (FAB) that opens a rich chat window similar to Intercom or Microsoft Copilot. It supports:
- **Streaming Markdown** with syntax highlighting
- **Action Buttons** (AI can trigger UI actions)
- **Context Awareness** (automatically extracts current route, resource, and record ID)
- **Persistence** local storage history

```svelte
<script>
  import { ChatDialog } from '@svadmin/ui';
</script>

<!-- Renders the floating chat bubble -->
<ChatDialog />
```

---

## 2. SmartSuggest (AI Autocomplete)
An unobtrusive input field that displays ghost text predicting what the user will type next, based on context and current input.

```svelte
<script>
  import { SmartSuggest } from '@svadmin/ui';
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
  import { AICommandBar } from '@svadmin/ui';
  let open = $state(false);
</script>

<AICommandBar bind:open />
```

---

## 4. CopilotPanel (Context-Aware Assistant)
A right-side slide-out panel that automatically fetches smart insights specifically tailored for the page the admin is viewing.

```svelte
<script>
  import { CopilotPanel } from '@svadmin/ui';
</script>

<!-- Pulls context automatically via getChatContext() -->
<CopilotPanel open={true} />
```

---

## 5. InsightCard (Dashboard Analytics)
A dashboard card widget that takes a raw data string (context) and generates an executive summary summary.

```svelte
<script>
  import { InsightCard } from '@svadmin/ui';
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
  import { VoiceInput } from '@svadmin/ui';
  let speechText = $state('');
</script>

<VoiceInput onresult={(text) => speechText = text} />
```

---

## Utility: MarkdownRenderer
The engine under the hood for `ChatDialog` and `CopilotPanel`. Displays streaming text with a typing cursor block and injects "Copy" buttons onto fenced code blocks.

```svelte
<script>
  import { MarkdownRenderer } from '@svadmin/ui';
</script>

<MarkdownRenderer content="...markdown..." streaming={true} />
```
