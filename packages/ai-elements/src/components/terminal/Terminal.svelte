<script module lang="ts">
  export type TerminalLineKind = 'input' | 'output' | 'error' | 'system' | 'success';

  export interface TerminalLine {
    id?: string;
    text: string;
    kind?: TerminalLineKind;
    timestamp?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, isPromiseLike } from '../../utils.js';
  import AnsiText from './AnsiText.svelte';

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'title'> {
    lines?: TerminalLine[];
    output?: string;
    isStreaming?: boolean;
    autoScroll?: boolean;
    value?: string;
    prompt?: string;
    title?: string;
    cwd?: string;
    readOnly?: boolean;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
    oncommand?: (command: string) => void | Promise<void>;
    oncommanderror?: (error: Error, command: string) => void;
    onclear?: () => void;
    onClear?: () => void;
  }

  let {
    lines = [],
    output,
    isStreaming = false,
    autoScroll = true,
    value = $bindable(''),
    prompt = '$',
    title = 'Terminal',
    cwd,
    readOnly = false,
    disabled = false,
    class: className = '',
    children,
    oncommand,
    oncommanderror,
    onclear,
    onClear,
    ...rest
  }: Props = $props();

  let localLines = $state<TerminalLine[]>([]);
  let commandHistory = $state<string[]>([]);
  let historyIndex = $state(-1);
  let submitting = $state(false);
  let inputElement: HTMLInputElement | undefined = $state();
  let bodyElement: HTMLDivElement | undefined = $state();
  const renderedLines = $derived([...lines, ...localLines]);
  const outputText = $derived(output ?? renderedLines.map((line) => line.text).join('\n'));
  const effectiveStreaming = $derived(submitting || isStreaming);
  const statusLabel = $derived(effectiveStreaming ? 'Running command' : readOnly ? 'Read only' : 'Ready');
  const hasClearCallback = $derived(Boolean(onclear || onClear));

  import { provideTerminalContext } from './context.svelte.js';
  provideTerminalContext({
    get output() { return outputText; },
    get lines() { return renderedLines; },
    get isStreaming() { return effectiveStreaming; },
    get autoScroll() { return autoScroll; },
    get onClear() { return hasClearCallback ? clearTerminal : undefined; },
  });

  $effect(() => {
    void outputText;
    if (autoScroll && bodyElement) bodyElement.scrollTop = bodyElement.scrollHeight;
  });

  function submitCommand(): void {
    const command = value.trim();
    if (!command || disabled || readOnly || submitting) return;

    localLines = [...localLines, { text: command, kind: 'input' }];
    commandHistory = [command, ...commandHistory.filter((entry) => entry !== command)].slice(0, 50);
    historyIndex = -1;
    value = '';

    try {
      const result = oncommand?.(command);
      if (isPromiseLike(result)) {
        submitting = true;
        result.then(
          () => { submitting = false; },
          (error) => {
            submitting = false;
            const resolvedError = error instanceof Error ? error : new Error(String(error));
            localLines = [...localLines, { text: resolvedError.message, kind: 'error' }];
            oncommanderror?.(resolvedError, command);
          },
        );
      }
    } catch (error) {
      submitting = false;
      const resolvedError = error instanceof Error ? error : new Error(String(error));
      localLines = [...localLines, { text: resolvedError.message, kind: 'error' }];
      oncommanderror?.(resolvedError, command);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCommand();
      return;
    }
    if (event.key === 'ArrowUp' && commandHistory.length) {
      event.preventDefault();
      historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      value = commandHistory[historyIndex] ?? '';
      return;
    }
    if (event.key === 'ArrowDown' && commandHistory.length) {
      event.preventDefault();
      historyIndex = Math.max(historyIndex - 1, -1);
      value = historyIndex < 0 ? '' : commandHistory[historyIndex] ?? '';
    }
  }

  function clearTerminal(): void {
    localLines = [];
    onclear?.();
    if (onClear !== onclear) onClear?.();
    inputElement?.focus();
  }
</script>

<section aria-label={title} {...rest} class={cn('svadmin-ai-terminal', children && 'svadmin-ai-terminal--compound', className)} data-slot="terminal">
  {#if children}
    {@render children()}
  {:else}
  <header class="svadmin-ai-terminal__header">
    <div class="svadmin-ai-terminal__heading">
      <span class="svadmin-ai-terminal__dot" aria-hidden="true"></span>
      <h3>{title}</h3>
      {#if cwd}<span class="svadmin-ai-terminal__cwd">{cwd}</span>{/if}
    </div>
    <div class="svadmin-ai-terminal__actions">
      <span class="svadmin-ai-terminal__status" role="status" aria-live="polite">{statusLabel}</span>
      {#if hasClearCallback}
        <button type="button" class="svadmin-ai-terminal__clear" aria-label="Clear terminal" onclick={clearTerminal} disabled={disabled || submitting}>Clear</button>
      {/if}
    </div>
  </header>

  <div bind:this={bodyElement} class="svadmin-ai-terminal__body" role="log" aria-live="polite" aria-busy={submitting}>
    {#if output !== undefined}
      <div class="svadmin-ai-terminal__line"><code><AnsiText text={output} /></code></div>
    {:else}
    {#each renderedLines as line, index (line.id ?? `${line.kind ?? 'output'}-${index}-${line.text}`)}
      <div class={cn('svadmin-ai-terminal__line', `svadmin-ai-terminal__line--${line.kind ?? 'output'}`)}>
        {#if line.kind === 'input'}<span class="svadmin-ai-terminal__prompt" aria-hidden="true">{prompt}</span>{/if}
        <code><AnsiText text={line.text} /></code>
        {#if line.timestamp}<time datetime={line.timestamp}>{line.timestamp}</time>{/if}
      </div>
    {:else}
      <p class="svadmin-ai-terminal__empty">No output yet.</p>
    {/each}
    {/if}
  </div>

  {#if oncommand && !readOnly}
    <form class="svadmin-ai-terminal__form" onsubmit={(event) => { event.preventDefault(); submitCommand(); }}>
      <label class="svadmin-ai-terminal__input-label">
        <span class="svadmin-ai-terminal__prompt" aria-hidden="true">{prompt}</span>
        <input
          bind:this={inputElement}
          bind:value
          class="svadmin-ai-terminal__input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          aria-label="Terminal command"
          placeholder="Enter a command"
          {disabled}
          onkeydown={handleKeydown}
        />
      </label>
    </form>
  {/if}
  {/if}
</section>

<style>
  .svadmin-ai-terminal { display: grid; overflow: hidden; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, Canvas); color: var(--foreground, CanvasText); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .svadmin-ai-terminal__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .6rem .8rem; border-bottom: 1px solid var(--border, currentColor); background: var(--muted, transparent); font-family: inherit; }
  .svadmin-ai-terminal__heading, .svadmin-ai-terminal__actions { display: flex; align-items: center; min-width: 0; gap: .55rem; }
  .svadmin-ai-terminal__dot { width: .55rem; height: .55rem; flex: none; border-radius: 50%; background: var(--success, currentColor); }
  h3 { margin: 0; font-size: .8rem; font-weight: 650; }
  .svadmin-ai-terminal__cwd, .svadmin-ai-terminal__status { overflow: hidden; color: var(--muted-foreground, currentColor); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-terminal__clear { border: 0; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: .72rem; cursor: pointer; }
  .svadmin-ai-terminal__clear:hover:not(:disabled) { color: var(--foreground, currentColor); }
  .svadmin-ai-terminal__clear:focus-visible, .svadmin-ai-terminal__input:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-terminal__clear:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-terminal__body { min-height: 8rem; max-height: 28rem; overflow: auto; padding: .8rem; }
  .svadmin-ai-terminal__line { display: flex; gap: .55rem; min-height: 1.35rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
  .svadmin-ai-terminal__line--error { color: var(--destructive, currentColor); }
  .svadmin-ai-terminal__line--success { color: var(--success, currentColor); }
  .svadmin-ai-terminal__line--system { color: var(--muted-foreground, currentColor); }
  .svadmin-ai-terminal__prompt { flex: none; color: var(--primary, currentColor); user-select: none; }
  .svadmin-ai-terminal__line time { margin-left: auto; color: var(--muted-foreground, currentColor); font-size: .68rem; }
  .svadmin-ai-terminal__empty { margin: 0; color: var(--muted-foreground, currentColor); font-size: .78rem; }
  .svadmin-ai-terminal__form { border-top: 1px solid var(--border, currentColor); padding: .7rem .8rem; }
  .svadmin-ai-terminal__input-label { display: flex; align-items: center; gap: .55rem; }
  .svadmin-ai-terminal__input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; }
  .svadmin-ai-terminal--compound { display: flex; flex-direction: column; }
</style>
