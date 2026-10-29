<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface TourStep {
    target?: string;
    title: string;
    description?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
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
    onfinish,
    onclose,
    onstepchange,
    class: className = '',
    children,
  }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  let rect = $state<{ top: number; left: number; width: number; height: number } | null>(null);
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
    if (step?.placement === 'top') top = rect.top - gap - 160;
    if (step?.placement === 'left') left = Math.max(12, rect.left - width - gap);
    if (step?.placement === 'right') left = Math.min(window.innerWidth - width - 12, rect.left + rect.width + gap);
    const maxTop = Math.max(12, window.innerHeight - 200);
    top = Math.max(12, Math.min(top, maxTop));
    return `top:${top}px;left:${left}px;width:${width}px`;
  }

  function close(): void {
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
  <div data-targeted={rect ? 'true' : 'false'} class={cn('svadmin-tour', className)}>
    <button type="button" tabindex="-1" class="svadmin-tour__dismiss" aria-label={skipText} onclick={close}></button>
    {#if rect}
      <div
        class="svadmin-tour__spotlight"
        aria-hidden="true"
        style:top={`${rect.top - 4}px`}
        style:left={`${rect.left - 4}px`}
        style:width={`${rect.width + 8}px`}
        style:height={`${rect.height + 8}px`}
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
        <p class="svadmin-tour__eyebrow">{title} · {current + 1}/{steps.length}</p>
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
  .svadmin-tour[data-targeted='false'] .svadmin-tour__dismiss { background: color-mix(in srgb, var(--foreground) 32%, transparent); }
  .svadmin-tour__spotlight {
    position: fixed;
    z-index: 61;
    border-radius: var(--radius-md);
    box-shadow: 0 0 0 9999px color-mix(in srgb, var(--foreground) 42%, transparent), 0 0 0 2px var(--primary);
    pointer-events: none;
  }
  .svadmin-tour__panel {
    position: fixed;
    z-index: 62;
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
