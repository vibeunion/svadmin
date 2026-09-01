<script module lang="ts">
  export interface StackTraceFrame {
    id?: string;
    functionName?: string;
    file?: string;
    line?: number;
    column?: number;
    source?: string;
    context?: string[];
  }

  export interface StackTraceErrorData {
    name?: string;
    message?: string;
    stack?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { ChevronDown, Copy, ExternalLink } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'title'> {
    trace?: string;
    error?: StackTraceErrorData | Error | string;
    message?: string;
    stack?: string;
    frames?: StackTraceFrame[];
    title?: string;
    open?: boolean;
    defaultOpen?: boolean;
    class?: string;
    children?: Snippet;
    onframeclick?: (frame: StackTraceFrame, index: number) => void;
    onopenchange?: (open: boolean) => void;
    onfilepathclick?: (filePath: string, line?: number, column?: number) => void;
    onOpenChange?: (open: boolean) => void;
    onFilePathClick?: (filePath: string, line?: number, column?: number) => void;
  }

  let {
    trace,
    error,
    message,
    stack,
    frames,
    title = 'Stack trace',
    defaultOpen = false,
    open = $bindable(defaultOpen),
    class: className = '',
    children,
    onframeclick,
    onopenchange,
    onfilepathclick,
    onOpenChange,
    onFilePathClick,
    ...rest
  }: Props = $props();

  import { parseStackTrace as parseCompoundStackTrace, provideStackTraceContext } from './context.svelte.js';

  let selectedId = $state<string | undefined>();
  let copied = $state(false);
  const errorRecord = $derived(typeof error === 'object' && error !== null ? error as StackTraceErrorData : undefined);
  const errorMessage = $derived(message ?? (typeof error === 'string' ? error : errorRecord?.message));
  const stackText = $derived(trace ?? stack ?? errorRecord?.stack ?? (error instanceof Error ? error.stack : undefined) ?? '');
  const resolvedFrames = $derived(frames?.length ? frames : parseStack(stackText));
  const selectedFrame = $derived(resolvedFrames.find((frame) => frame.id === selectedId));
  const compoundTrace = $derived(parseCompoundStackTrace(stackText));
  provideStackTraceContext({
    get trace() { return compoundTrace; },
    get raw() { return stackText; },
    get open() { return open; },
    setOpen(nextOpen) { open = nextOpen; onopenchange?.(nextOpen); if (onOpenChange !== onopenchange) onOpenChange?.(nextOpen); },
    get onFilePathClick() { return onfilepathclick ?? onFilePathClick; },
  });

  function parseStack(value: string): StackTraceFrame[] {
    return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const match = line.match(/^(?:at\s+)?(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (!match) return { id: `frame-${index}`, source: line };
      return {
        id: `frame-${index}`,
        functionName: match[1] || undefined,
        file: match[2],
        line: Number(match[3]),
        column: Number(match[4]),
        source: line,
      };
    });
  }

  async function copyStack(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(stackText);
      copied = true;
      setTimeout(() => { copied = false; }, 1600);
    } catch {
      copied = false;
    }
  }
</script>

{#if children}
<section {...rest} class={cn('svadmin-ai-stack-trace', 'svadmin-ai-stack-trace--compound', className)} data-slot="stack-trace">
  {@render children()}
</section>
{:else}
<details {...rest} class={cn('svadmin-ai-stack-trace', className)} {open} ontoggle={(event) => { const next = (event.currentTarget as HTMLDetailsElement).open; open = next; onopenchange?.(next); if (onOpenChange !== onopenchange) onOpenChange?.(next); }}>
  <summary class="svadmin-ai-stack-trace__summary">
    <span class="svadmin-ai-stack-trace__summary-main">
      <span class="svadmin-ai-stack-trace__chevron" aria-hidden="true"><ChevronDown size={15} /></span>
      <span>{title}</span>
      {#if errorMessage}<strong>{errorMessage}</strong>{/if}
    </span>
    <button type="button" class="svadmin-ai-stack-trace__copy" aria-label={copied ? 'Stack copied' : 'Copy stack trace'} title={copied ? 'Copied' : 'Copy stack trace'} onclick={(event) => { event.preventDefault(); void copyStack(); }} disabled={!stackText}>
      <Copy size={14} aria-hidden="true" />
      <span class="svadmin-ai__sr-only">{copied ? 'Copied' : 'Copy stack trace'}</span>
    </button>
  </summary>

  <div class="svadmin-ai-stack-trace__content">
    {#if resolvedFrames.length}
      <ol class="svadmin-ai-stack-trace__frames" aria-label="Stack frames">
        {#each resolvedFrames as frame, index (frame.id ?? `${index}-${frame.source ?? frame.file}`)}
          <li class={cn('svadmin-ai-stack-trace__frame', selectedFrame?.id === frame.id && 'svadmin-ai-stack-trace__frame--selected')}>
            <button type="button" onclick={() => { selectedId = frame.id; onframeclick?.(frame, index); if (frame.file) (onfilepathclick ?? onFilePathClick)?.(frame.file, frame.line, frame.column); }}>
              <span class="svadmin-ai-stack-trace__index" aria-hidden="true">{index + 1}</span>
              <span class="svadmin-ai-stack-trace__frame-copy">
                <strong>{frame.functionName ?? 'anonymous'}</strong>
                <span>{frame.file ?? frame.source ?? 'Unknown location'}{#if frame.line}:{frame.line}{/if}{#if frame.column}:{frame.column}{/if}</span>
              </span>
              {#if frame.file && (onfilepathclick || onFilePathClick)}<ExternalLink size={13} aria-hidden="true" />{/if}
            </button>
            {#if selectedFrame?.id === frame.id && frame.context?.length}
              <pre>{frame.context.join('\n')}</pre>
            {/if}
          </li>
        {/each}
      </ol>
    {:else}
      <p class="svadmin-ai-stack-trace__empty">No stack frames available.</p>
    {/if}
  </div>
</details>
{/if}

<style>
  .svadmin-ai-stack-trace { border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-stack-trace__summary { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .65rem .8rem; cursor: pointer; list-style: none; }
  .svadmin-ai-stack-trace__summary::-webkit-details-marker { display: none; }
  .svadmin-ai-stack-trace__summary:focus-visible, .svadmin-ai-stack-trace__copy:focus-visible, .svadmin-ai-stack-trace__frame button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-stack-trace__summary-main { display: inline-flex; min-width: 0; align-items: center; gap: .45rem; font-size: .82rem; }
  .svadmin-ai-stack-trace[open] .svadmin-ai-stack-trace__chevron { transform: rotate(180deg); }
  .svadmin-ai-stack-trace__summary-main strong { overflow: hidden; color: var(--destructive, currentColor); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-stack-trace__copy { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-stack-trace__copy:disabled { cursor: not-allowed; opacity: .45; }
  .svadmin-ai-stack-trace__content { border-top: 1px solid var(--border, currentColor); padding: .5rem; }
  .svadmin-ai-stack-trace__frames { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-ai-stack-trace__frame { border-radius: min(var(--radius, .5rem), .35rem); }
  .svadmin-ai-stack-trace__frame--selected { background: var(--muted, transparent); }
  .svadmin-ai-stack-trace__frame button { display: flex; width: 100%; align-items: center; gap: .6rem; padding: .5rem; border: 0; border-radius: inherit; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .svadmin-ai-stack-trace__index { width: 1.35rem; flex: none; color: var(--muted-foreground, currentColor); font-size: .7rem; text-align: right; }
  .svadmin-ai-stack-trace__frame-copy { display: grid; min-width: 0; gap: .12rem; flex: 1; }
  .svadmin-ai-stack-trace__frame-copy strong { overflow: hidden; font-size: .77rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-stack-trace__frame-copy span { overflow: hidden; color: var(--muted-foreground, currentColor); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
  pre { margin: .1rem .6rem .6rem 2.55rem; overflow: auto; padding: .6rem; border-radius: .35rem; background: var(--muted, transparent); font-size: .72rem; line-height: 1.5; }
  .svadmin-ai-stack-trace__empty { margin: 0; padding: .75rem; color: var(--muted-foreground, currentColor); font-size: .8rem; }
  .svadmin-ai-stack-trace--compound { overflow: hidden; }
</style>
