<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface TourStep {
    target?: string;
    title: string;
    description?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  }

  interface Props {
    steps: TourStep[];
    open?: boolean;
    current?: number;
    title?: string;
    nextText?: string;
    previousText?: string;
    finishText?: string;
    skipText?: string;
    onfinish?: () => void;
    onclose?: () => void;
    onstepchange?: (index: number) => void;
    storageKey?: string;
    class?: string;
    children?: Snippet<[TourStep, number]>;
  }

  let {
    steps,
    open = $bindable(false),
    current = $bindable(0),
    title = 'Guided tour',
    nextText = 'Next',
    previousText = 'Back',
    finishText = 'Done',
    skipText = 'Skip',
    storageKey,
    onfinish,
    onclose,
    onstepchange,
    class: className = '',
    children,
  }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  let rect = $state<{ top: number; left: number; width: number; height: number } | null>(null);
  const maskId = `svadmin-tour-mask-${Math.random().toString(36).slice(2, 8)}`;

  const step = $derived(steps[Math.max(0, Math.min(current, steps.length - 1))]);
  const last = $derived(current >= steps.length - 1);

  function measure(): void {
    if (!open || !step?.target) {
      rect = null;
      return;
    }
    const target = document.querySelector(step.target);
    if (!(target instanceof HTMLElement)) {
      rect = null;
      return;
    }
    const box = target.getBoundingClientRect();
    rect = { top: box.top, left: box.left, width: box.width, height: box.height };
  }

  function panelStyle(): string {
    if (!rect) return '';
    const gap = 12;
    const width = Math.min(320, window.innerWidth - 24);
    let top = rect.top + rect.height + gap;
    let left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const placement = step?.placement ?? 'auto';

    if (placement === 'top') {
      top = rect.top - gap - 160;
    } else if (placement === 'left') {
      left = Math.max(12, rect.left - width - gap);
      top = rect.top;
    } else if (placement === 'right') {
      left = Math.min(window.innerWidth - width - 12, rect.left + rect.width + gap);
      top = rect.top;
    } else if (placement === 'bottom') {
      top = rect.top + rect.height + gap;
    }

    const maxTop = Math.max(12, window.innerHeight - 200);
    top = Math.max(12, Math.min(top, maxTop));
    return `top:${top}px;left:${left}px;width:${width}px`;
  }

  function close(): void {
    if (storageKey && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
    }
    open = false;
    onclose?.();
  }

  function move(delta: number): void {
    const next = Math.max(0, Math.min(current + delta, steps.length - 1));
    if (next === current) return;
    current = next;
    onstepchange?.(next);
  }

  function finish(): void {
    if (storageKey && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
    }
    open = false;
    onfinish?.();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight') move(1);
    else if (event.key === 'ArrowLeft') move(-1);
    else if (event.key === 'Tab' && panel) {
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]')]
        .filter(element => {
          if (element.tabIndex < 0 || element.closest('[hidden], [inert]') || (element instanceof HTMLInputElement && element.type === 'hidden')) return false;
          if (getComputedStyle(element).visibility === 'hidden') return false;
          for (let node: HTMLElement | null = element; node && node !== panel; node = node.parentElement) {
            if (getComputedStyle(node).display === 'none') return false;
          }
          return true;
        });
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outsideControls = !focusable.includes(document.activeElement as HTMLElement);
      if (event.shiftKey && (document.activeElement === first || outsideControls)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outsideControls)) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  $effect(() => {
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        if (localStorage.getItem(storageKey) === 'true') {
          open = false;
          return;
        }
      } catch { /* ignore */ }
    }
  });

  $effect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    untrack(() => {
      const target = step?.target ? document.querySelector(step.target) : null;
      target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      measure();
      panel?.focus();
    });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      previous?.focus();
    };
  });
</script>

{#if open}
  <div data-svadmin-component="TourGuide" data-targeted={rect ? 'true' : 'false'} class={cn('svadmin-tour', className)}>
    <!-- Background dismissal trigger to block click-through -->
    <button type="button" tabindex="-1" class="svadmin-tour__dismiss" aria-label={skipText} onclick={close}></button>

    <!-- Pure SVG Viewport Cutout Mask for Target Element Spotlight -->
    {#if rect}
      <svg class="svadmin-tour__svg-mask fixed inset-0 w-full h-full pointer-events-none z-[61]" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - 6}
              y={rect.top - 6}
              width={rect.width + 12}
              height={rect.height + 12}
              rx="8"
              ry="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="color-mix(in srgb, var(--foreground) 45%, transparent)"
          mask="url(#{maskId})"
        />
      </svg>
      <div
        class="svadmin-tour__spotlight"
        aria-hidden="true"
        style:top={`${rect.top - 6}px`}
        style:left={`${rect.left - 6}px`}
        style:width={`${rect.width + 12}px`}
        style:height={`${rect.height + 12}px`}
      ></div>
    {/if}

    <div
      bind:this={panel}
      class="svadmin-tour__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="svadmin-tour-title"
      tabindex="-1"
      style={panelStyle()}
      onkeydown={onKeydown}
    >
      <header class="svadmin-tour__header">
        <div class="flex items-center justify-between gap-2">
          <p class="svadmin-tour__eyebrow">{title} · {current + 1}/{steps.length}</p>
          <span class="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {current + 1} / {steps.length}
          </span>
        </div>
        <h2 id="svadmin-tour-title">{step?.title}</h2>
        {#if step?.description}<p class="svadmin-tour__description">{step.description}</p>{/if}
      </header>
      {#if children && step}
        <div class="svadmin-tour__content">{@render children(step, current)}</div>
      {/if}
      <footer class="svadmin-tour__footer">
        <button type="button" class="svadmin-tour__button" onclick={close}>{skipText}</button>
        <div class="svadmin-tour__actions">
          <button type="button" class="svadmin-tour__button" disabled={current === 0} onclick={() => move(-1)}>{previousText}</button>
          <button type="button" class="svadmin-tour__button is-primary" onclick={() => (last ? finish() : move(1))}>{last ? finishText : nextText}</button>
        </div>
      </footer>
    </div>
  </div>
{/if}

<style>
  .svadmin-tour__dismiss { position: fixed; inset: 0; z-index: 60; border: 0; background: transparent; cursor: default; }
  .svadmin-tour[data-targeted='false'] .svadmin-tour__dismiss { background: color-mix(in srgb, var(--foreground) 38%, transparent); }
  .svadmin-tour__spotlight {
    position: fixed;
    z-index: 62;
    border-radius: var(--radius-md);
    box-shadow: 0 0 0 2px var(--primary), 0 0 16px color-mix(in srgb, var(--primary) 35%, transparent);
    pointer-events: none;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .svadmin-tour__panel {
    position: fixed;
    z-index: 63;
    display: grid;
    max-width: calc(100vw - 1.5rem);
    gap: var(--svadmin-space-4);
    padding: var(--svadmin-space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--shadow-lg, 0 16px 44px color-mix(in srgb, var(--foreground) 18%, transparent));
  }
  .svadmin-tour[data-targeted='false'] .svadmin-tour__panel { inset: 50% auto auto 50%; width: min(24rem, calc(100vw - 2rem)); transform: translate(-50%, -50%); }
  .svadmin-tour__eyebrow { margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-tour__header h2 { margin: var(--svadmin-space-1) 0 0; font-size: var(--svadmin-text-title); line-height: var(--svadmin-leading-tight); }
  .svadmin-tour__description { margin: var(--svadmin-space-2) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); }
  .svadmin-tour__footer { display: flex; align-items: center; justify-content: space-between; gap: var(--svadmin-space-2); }
  .svadmin-tour__actions { display: flex; gap: var(--svadmin-space-2); }
  .svadmin-tour__button { min-height: var(--svadmin-control-h-sm); padding-inline: var(--svadmin-space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--background); color: var(--foreground); font-size: var(--svadmin-text-label); cursor: pointer; }
  .svadmin-tour__button:disabled { opacity: 0.45; cursor: not-allowed; }
  .svadmin-tour__button.is-primary { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }
  .svadmin-tour__button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
