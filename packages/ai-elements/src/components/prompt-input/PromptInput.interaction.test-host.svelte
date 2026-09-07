<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import {
    PromptInput, PromptInputAttachment, PromptInputAttachments, PromptInputProvider,
    PromptInputSubmit, PromptInputTextarea,
  } from './index.js';

  let {
    mode = 'composed',
    provider = false,
    initialInput = '',
    formProps = {},
    submitProps = {},
    textareaProps = {},
    onNativeSubmit,
  }: {
    mode?: 'default' | 'composed' | 'provider' | 'standalone';
    provider?: boolean;
    initialInput?: string;
    formProps?: ComponentProps<typeof PromptInput>;
    submitProps?: ComponentProps<typeof PromptInputSubmit>;
    textareaProps?: ComponentProps<typeof PromptInputTextarea>;
    onNativeSubmit?: (event: SubmitEvent) => void;
  } = $props();
</script>

{#snippet controls()}
  {#if mode !== 'standalone'}
    <PromptInputTextarea aria-label="Prompt input" {...textareaProps} />
    <PromptInputAttachments>
      {#snippet children(file)}
        <PromptInputAttachment data={file} />
      {/snippet}
    </PromptInputAttachments>
  {/if}
  <PromptInputSubmit {...submitProps} />
{/snippet}

{#snippet form()}
  {#if mode === 'default'}
    <PromptInput {...formProps} />
  {:else if mode === 'composed'}
    <PromptInput {...formProps}>{@render controls()}</PromptInput>
  {:else}
    <form aria-label="Native prompt" onsubmit={(event) => { event.preventDefault(); onNativeSubmit?.(event); }}>
      {@render controls()}
    </form>
  {/if}
{/snippet}

{#if provider || mode === 'provider'}
  <PromptInputProvider {initialInput}>{@render form()}</PromptInputProvider>
{:else}
  {@render form()}
{/if}
