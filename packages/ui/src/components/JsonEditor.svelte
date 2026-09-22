<script lang="ts">
  import type { Component } from 'svelte';
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';

  /**
   * Thin adapter over the Svelte ecosystem `svelte-jsoneditor` package. The
   * dependency is optional: if it cannot be loaded, a validating `<textarea>`
   * fallback keeps the field usable.
   */
  type JsonMode = 'tree' | 'text' | 'table';

  interface Props {
    /** Parsed JSON value. */
    value?: unknown;
    mode?: JsonMode;
    readonly?: boolean;
    /** Height of the editor surface (CSS length). */
    height?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (value: unknown) => void;
    onerror?: (message: string) => void;
  }

  let {
    value = $bindable(undefined),
    mode = 'tree',
    readonly = false,
    height = '22rem',
    ariaLabel = 'JSON editor',
    class: className = '',
    onchange,
    onerror,
  }: Props = $props();

  const generatedId = $props.id();
  const errorId = `${generatedId}-error`;

  let Editor = $state<Component<Record<string, unknown>> | null>(null);
  let unavailable = $state(false);
  let error = $state('');

  function format(input: unknown): string {
    if (input === undefined) return '';
    try {
      return JSON.stringify(input, null, 2) ?? '';
    } catch {
      return '';
    }
  }

  let text = $state(format(value));

  onMount(() => {
    let active = true;
    import('svelte-jsoneditor')
      .then((module) => {
        if (active) Editor = module.JSONEditor as unknown as Component<Record<string, unknown>>;
      })
      .catch(() => {
        if (active) unavailable = true;
      });
    return () => {
      active = false;
    };
  });

  function handleEditorChange(updated: { content?: { json?: unknown; text?: string } }): void {
    const content = updated?.content ?? {};
    const next = 'json' in content ? content.json : content.text;
    value = next;
    error = '';
    onchange?.(next);
  }

  function handleFallbackInput(next: string): void {
    text = next;
    if (next.trim() === '') {
      error = '';
      value = undefined;
      onchange?.(undefined);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(next);
      error = '';
      value = parsed;
      onchange?.(parsed);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Invalid JSON';
      error = message;
      onerror?.(message);
    }
  }

  const editorProps = $derived({
    content: { json: value },
    mode,
    readOnly: readonly,
    ariaLabel,
    mainMenuBar: !readonly,
    navigationBar: !readonly,
    statusBar: true,
    onChange: handleEditorChange,
  });

  const editorState = $derived(Editor ? 'ready' : unavailable ? 'unavailable' : 'loading');
</script>

<div
  class={cn('svadmin-json-editor', className)}
  data-slot="json-editor"
  data-state={editorState}
>
  {#if Editor}
    <div class="svadmin-json-editor__surface" style={`height: ${height};`}>
      <Editor {...editorProps} />
    </div>
  {:else}
    <textarea
      class="svadmin-json-editor__fallback"
      style={`min-height: ${height};`}
      bind:value={text}
      {readonly}
      aria-label={ariaLabel}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
      oninput={(event) => handleFallbackInput((event.currentTarget as HTMLTextAreaElement).value)}
    ></textarea>
    {#if error}<p id={errorId} class="svadmin-json-editor__error" role="alert">{error}</p>{/if}
    {#if unavailable}
      <p class="svadmin-json-editor__hint" role="status">
        Install <code>svelte-jsoneditor</code> to enable the structured editor.
      </p>
    {/if}
  {/if}
</div>

<style>
  .svadmin-json-editor {
    overflow: hidden;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
  }

  .svadmin-json-editor:focus-within { outline: 2px solid var(--ring, currentColor); outline-offset: 1px; }
  .svadmin-json-editor__surface { width: 100%; }
  .svadmin-json-editor__fallback {
    display: block;
    width: 100%;
    border: 0;
    padding: 0.75rem;
    background: transparent;
    color: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    resize: vertical;
  }
  .svadmin-json-editor__fallback:focus { outline: none; }
  .svadmin-json-editor__error {
    margin: 0;
    border-top: 1px solid var(--destructive, currentColor);
    padding: 0.5rem 0.75rem;
    color: var(--destructive, currentColor);
    font-size: 0.75rem;
  }
  .svadmin-json-editor__hint {
    margin: 0;
    border-top: 1px solid var(--border, currentColor);
    padding: 0.5rem 0.75rem;
    color: var(--muted-foreground, currentColor);
    font-size: 0.75rem;
  }
  .svadmin-json-editor__hint code { color: var(--foreground, currentColor); }
</style>