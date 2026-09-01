<script lang="ts">
  import { Copy } from '@lucide/svelte';
  import * as Artifact from './artifact/index.js';
  import * as Conversation from './conversation/index.js';
  import * as Message from './message/index.js';
  import * as OpenIn from './open-in-chat/index.js';
  import * as PromptInput from './prompt-input/index.js';
  import * as Reasoning from './reasoning/index.js';
  import * as Tool from './tool/index.js';

  let {
    streaming = false,
    promptValue = 'native form value',
  }: { streaming?: boolean; promptValue?: string } = $props();

  let reasoningOpen = $state(false);
</script>

{#snippet emptyIcon()}
  <span data-testid="empty-state-icon">Empty icon</span>
{/snippet}

<div data-testid="tooltip-scroll-container" style="overflow: auto">
  <Message.Root from="assistant" id="message-contract" data-contract="message">
    <Message.Content>
      <Message.Response isAnimating={streaming}>Composed response</Message.Response>
      <Message.Response children="**Explicit markdown**" />
      <Message.Response content="**Markdown response**" />
    </Message.Content>
    <Message.Actions>
      <Message.Action tooltip="Copy response" data-testid="message-action">Copy</Message.Action>
    </Message.Actions>
  </Message.Root>
</div>

<Conversation.Root aria-label="Contract conversation">
  <Conversation.Content>
    <p>Conversation content</p>
    <Conversation.EmptyState icon={emptyIcon} />
  </Conversation.Content>
  <Conversation.ScrollButton data-testid="scroll-button" />
</Conversation.Root>

<Reasoning.Root isStreaming={streaming} bind:open={reasoningOpen}>
  <Reasoning.Trigger />
  <Reasoning.Content text="Reasoning details" />
</Reasoning.Root>
<output data-testid="reasoning-open">{reasoningOpen}</output>

<PromptInput.Root
  name="prompt-form"
  id="prompt-contract"
  data-contract="form"
  syncHiddenInput
  value={promptValue}
  onsubmit={() => undefined}
>
  <PromptInput.Textarea aria-label="Contract prompt" />
</PromptInput.Root>

<Tool.Root name="search" state="output-available" input={{ query: 'svelte' }}>
  <Tool.Header />
</Tool.Root>

<Artifact.Root title="Contract artifact" content="hello">
  <Artifact.Header>
    <Artifact.Title>Contract artifact</Artifact.Title>
    <Artifact.Actions>
      <Artifact.Action icon={Copy} tooltip="Copy artifact" size="icon-sm" variant="outline" data-testid="artifact-action" />
      <Artifact.Close size="lg" variant="outline" data-testid="artifact-close" />
    </Artifact.Actions>
  </Artifact.Header>
</Artifact.Root>

<OpenIn.Root query="hello world">
  <OpenIn.Trigger />
  <OpenIn.Content>
    <OpenIn.ChatGPT data-testid="chatgpt-link" />
  </OpenIn.Content>
</OpenIn.Root>
