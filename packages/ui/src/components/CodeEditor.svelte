<script lang="ts">
  import type { Component } from 'svelte';
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';

  /**
   * Thin adapter over the Svelte ecosystem `svelte-codemirror-editor` package.
   * The dependency is optional: if it cannot be loaded, an accessible
   * `<textarea>` fallback keeps the field usable.
   */
  interface Props {
    value?: string;
    placeholder?: string;
    readonly?: boolean;
    editable?: boolean;
    lineNumbers?: boolean;
    lineWrapping?: boolean;
    tabSize?: number;
    /** CodeMirror extensions supplied by the host (languages, themes, …). */
    extensions?: readonly unknown[];
    lang?: unknown;
    theme?: unknown;
    ariaLabel?: string;
    class?: string;
    onchange?: (value: string) => void;
    onready?: (view: unknown) => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Write code…',
    readonly = false,
    editable = true,
    lineNumbers = true,
    lineWrapping = true,
    tabSize = 2,
    extensions,
    lang,
    theme,
    ariaLabel = 'Code editor',
    class: className = '',
    onchange,
    onready,
  }: Props = $props();

  let Editor = $state<Component<Record<string, unknown>> | null>(null);
  let unavailable = $state(false);

  onMount(() => {
    let active = true;
    import('svelte-codemirror-editor')
      .then((module) => {
        if (active) Editor = module.default as unknown as Component<Record<string, unknown>>;
      })
      .catch(() => {
        if (active) unavailable = true;
      });
    return () => {
      active = false;
    };
  });

  const editorProps = $derived({
    value,
    placeholder,
    readonly,
    editable,
    lineNumbers,
    lineWrapping,
    tabSize,
    ...(extensions ? { extensions: [...extensions] } : {}),
    ...(lang ? { lang } : {}),
    ...(theme ? { theme } : {}),
    ...(onready ? { onready } : {}),
    onchange: (next: string) => {
      value = next;
      onchange?.(next);
    },
  });

  const editorState = $derived(Editor ? 'ready' : unavailable ? 'unavailable' : 'loading');
</script>

<div
  class={cn('svadmin-code-editor', className)}
  data-slot="code-editor"
  data-state={editorState}
>
  {#if Editor}
    <Editor {...editorProps} />
  {:else}
    <textarea
      class="svadmin-code-editor__fallback"
      bind:value
      {placeholder}
      {readonly}
      disabled={!editable || readonly}
      aria-label={ariaLabel}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      wrap={lineWrapping ? 'soft' : 'off'}
      oninput={(event) => onchange?.((event.currentTarget as HTMLTextAreaElement).value)}
    ></textarea>
    {#if unavailable}
      <p class="svadmin-code-editor__hint" role="status">
        Install <code>svelte-codemirror-editor</code> and <code>codemirror</code> to enable syntax highlighting.
      </p>
    {/if}
  {/if}
</div>

<style>
  .svadmin-code-editor {
    overflow: hidden;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
  }

  .svadmin-code-editor:focus-within { outline: 2px solid var(--ring, currentColor); outline-offset: 1px; }
  .svadmin-code-editor__fallback {
    display: block;
    width: 100%;
    min-height: 8rem;
    border: 0;
    padding: 0.75rem;
    background: transparent;
    color: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    resize: vertical;
  }
  .svadmin-code-editor__fallback:focus { outline: none; }
  .svadmin-code-editor__hint {
    margin: 0;
    border-top: 1px solid var(--border, currentColor);
    padding: 0.5rem 0.75rem;
    color: var(--muted-foreground, currentColor);
    font-size: 0.75rem;
  }
  .svadmin-code-editor__hint code { color: var(--foreground, currentColor); }
</style>