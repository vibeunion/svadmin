<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import type { ChatMessage } from '../../contracts.js';
  import type { ConversationMessageFormatter } from './download.js';

  export type ConversationDownloadProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & {
    messages: ChatMessage[];
    filename?: string;
    formatMessage?: ConversationMessageFormatter;
    class?: string;
    children?: Snippet;
    ondownload?: (markdown: string) => void;
  };
</script>

<script lang="ts">
  import { Download } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { defaultFormatMessage, messagesToMarkdown } from './download.js';

  let {
    messages,
    filename = 'conversation.md',
    formatMessage = defaultFormatMessage,
    class: className = '',
    children,
    ondownload,
    type = 'button',
    disabled = false,
    ...rest
  }: ConversationDownloadProps = $props();

  function download(): void {
    if (disabled || typeof document === 'undefined') return;
    const markdown = messagesToMarkdown(messages, formatMessage);
    ondownload?.(markdown);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
</script>

<button {...rest} {type} {disabled} class={cn('svadmin-ai-conversation-download', className)} data-slot="conversation-download" aria-label="Download conversation" onclick={download}>
  {#if children}{@render children()}{:else}<Download size={16} aria-hidden="true" />{/if}
</button>

<style>
  .svadmin-ai-conversation-download { display: inline-flex; width: 2.25rem; height: 2.25rem; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: 50%; background: var(--background, transparent); color: var(--foreground, currentColor); cursor: pointer; }
  .svadmin-ai-conversation-download:hover:not(:disabled) { background: var(--muted, transparent); }
  .svadmin-ai-conversation-download:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-conversation-download:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
