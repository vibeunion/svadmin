<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import { Check, Pencil, X } from '@lucide/svelte';
  import CopyButton from './CopyButton.svelte';
  import { cn } from '../utils.js';

  export type TypographyType = 'default' | 'secondary' | 'success' | 'warning' | 'danger';

  interface Props {
    text?: string;
    type?: TypographyType;
    strong?: boolean;
    italic?: boolean;
    underline?: boolean;
    delete?: boolean;
    mark?: boolean;
    code?: boolean;
    copyable?: boolean;
    copyLabel?: string;
    copyDescription?: string;
    editable?: boolean;
    editing?: boolean;
    multiline?: boolean;
    editLabel?: string;
    saveLabel?: string;
    cancelLabel?: string;
    class?: string;
    children?: Snippet;
    onchange?: (text: string) => void;
    oncopied?: (text: string) => void;
  }

  let {
    text = $bindable(''),
    type = 'default',
    strong = false,
    italic = false,
    underline = false,
    delete: strikethrough = false,
    mark = false,
    code = false,
    copyable = false,
    copyLabel,
    copyDescription,
    editable = false,
    editing = $bindable(false),
    multiline = false,
    editLabel = 'Edit text',
    saveLabel = 'Save',
    cancelLabel = 'Cancel',
    class: className = '',
    children,
    onchange,
    oncopied,
  }: Props = $props();

  let draft = $state(text);
  let input = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);
  let previous = '';

  async function startEditing() {
    previous = text;
    draft = text;
    editing = true;
    await tick();
    input?.focus();
    input?.select();
  }

  function save() {
    if (!editing) return;
    editing = false;
    if (draft !== previous) {
      text = draft;
      onchange?.(draft);
    }
  }

  function cancel() {
    draft = previous;
    editing = false;
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    } else if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      save();
    }
  }
</script>

<span
  class={cn('svadmin-typography-text', className)}
  data-type={type}
  class:is-strong={strong}
  class:is-italic={italic}
  class:is-underline={underline}
  class:is-delete={strikethrough}
  class:is-mark={mark}
  class:is-code={code}
>
  {#if editing}
    <span class="svadmin-typography-text__editor">
      {#if multiline}
        <textarea bind:this={input} bind:value={draft} rows="3" onkeydown={keydown}></textarea>
      {:else}
        <input bind:this={input} bind:value={draft} onkeydown={keydown} />
      {/if}
      <button type="button" class="svadmin-typography-text__action" aria-label={saveLabel} onclick={save}>
        <Check size={13} />
      </button>
      <button type="button" class="svadmin-typography-text__action" aria-label={cancelLabel} onclick={cancel}>
        <X size={13} />
      </button>
    </span>
  {:else}
    <span class="svadmin-typography-text__content">{#if children}{@render children()}{:else}{text}{/if}</span>
    {#if copyable}
      <CopyButton value={text} description={copyDescription} label={copyLabel} oncopy={oncopied} class="svadmin-typography-text__action" />
    {/if}
    {#if editable}
      <button
        type="button"
        class="svadmin-typography-text__action"
        aria-label={editLabel}
        onclick={startEditing}
      >
        <Pencil size={13} />
      </button>
    {/if}
  {/if}
</span>

<style>
  .svadmin-typography-text {
    display: inline-flex;
    align-items: center;
    gap: var(--svadmin-space-1);
    max-width: 100%;
    color: var(--foreground);
    font-size: var(--svadmin-text-label);
    line-height: var(--svadmin-leading-body);
  }
  .svadmin-typography-text[data-type='secondary'] { color: var(--muted-foreground); }
  .svadmin-typography-text[data-type='success'] { color: var(--success); }
  .svadmin-typography-text[data-type='warning'] { color: var(--warning); }
  .svadmin-typography-text[data-type='danger'] { color: var(--destructive); }
  .svadmin-typography-text.is-strong { font-weight: 600; }
  .svadmin-typography-text.is-italic { font-style: italic; }
  .svadmin-typography-text.is-underline .svadmin-typography-text__content { text-decoration: underline; }
  .svadmin-typography-text.is-delete .svadmin-typography-text__content { text-decoration: line-through; }
  .svadmin-typography-text.is-mark .svadmin-typography-text__content {
    padding-inline: 0.2em;
    background: var(--warning-subtle, var(--accent));
    border-radius: var(--radius-sm);
  }
  .svadmin-typography-text.is-code .svadmin-typography-text__content {
    padding-inline: 0.3em;
    border-radius: var(--radius-sm);
    background: var(--muted);
    font-family: var(--svadmin-font-mono, ui-monospace, monospace);
    font-size: 0.9em;
  }
  .svadmin-typography-text__content { min-width: 0; overflow-wrap: anywhere; }
  .svadmin-typography-text__editor { display: inline-flex; align-items: center; gap: 0.25rem; }
  .svadmin-typography-text__editor input,
  .svadmin-typography-text__editor textarea {
    min-width: 8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.1875rem 0.375rem;
    background: var(--background);
    color: var(--foreground);
    font: inherit;
  }
  .svadmin-typography-text__editor input:focus,
  .svadmin-typography-text__editor textarea:focus {
    outline: 2px solid var(--ring);
    outline-offset: var(--svadmin-focus-offset, 1px);
  }
  .svadmin-typography-text__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }
  .svadmin-typography-text__action:hover { color: var(--foreground); background: var(--accent); }
</style>
