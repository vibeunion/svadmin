<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, X } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface StepItem {
    id?: string;
    title: string;
    subTitle?: string;
    subtitle?: string;
    description?: string;
    icon?: Snippet;
    disabled?: boolean;
    /** 单个节点覆盖整体状态（wait / process / finish / error）。 */
    status?: 'wait' | 'process' | 'finish' | 'error';
  }

  interface Props {
    current?: number;
    items: StepItem[];
    direction?: 'horizontal' | 'vertical';
    labelPlacement?: 'horizontal' | 'vertical';
    type?: 'default' | 'dot' | 'arrow' | 'navigation';
    size?: 'default' | 'small' | 'mini' | 'large';
    status?: 'wait' | 'process' | 'finish' | 'error';
    clickable?: boolean;
    class?: string;
    onchange?: (index: number) => void;
    /** `onchange` 的别名，便于宿主沿用 camelCase。 */
    onChange?: (index: number) => void;
  }

  let {
    current = 0,
    items,
    direction = 'horizontal',
    labelPlacement = 'horizontal',
    type = 'default',
    size = 'default',
    status = 'process',
    clickable = false,
    class: className = '',
    onchange,
    onChange,
  }: Props = $props();

  function state(index: number): 'finish' | 'process' | 'wait' | 'error' {
    const override = items[index]?.status;
    if (override) return override;
    if (index < current) return 'finish';
    if (index === current) return status === 'error' ? 'error' : status === 'finish' ? 'finish' : 'process';
    return 'wait';
  }

  function choose(index: number): void {
    const item = items[index];
    if (!clickable || !item || item.disabled || index === current) return;
    onchange?.(index);
    onChange?.(index);
  }
</script>

<ol
  class={cn('svadmin-steps', className)}
  data-direction={direction}
  data-label-placement={labelPlacement}
  data-type={type}
  data-size={size}
  aria-label="Steps"
>
  {#each items as item, index (item.id ?? `${item.title}-${index}`)}
    {@const stateValue = state(index)}
    <li class="svadmin-steps__item" data-status={stateValue} data-disabled={item.disabled || undefined}>
      <button
        type="button"
        class="svadmin-steps__action"
        disabled={!clickable || item.disabled}
        onclick={() => choose(index)}
        aria-current={index === current ? 'step' : undefined}
      >
        <span class="svadmin-steps__indicator" aria-hidden="true">
          {#if type === 'dot'}
            <span class="svadmin-steps__dot"></span>
          {:else if stateValue === 'finish'}
            <Check size={size === 'small' ? 12 : 14} />
          {:else if stateValue === 'error'}
            <X size={size === 'small' ? 12 : 14} />
          {:else if item.icon}
            {@render item.icon()}
          {:else}
            {index + 1}
          {/if}
        </span>
        <span class="svadmin-steps__text">
          <span class="svadmin-steps__title">
            {item.title}
            {#if item.subTitle || item.subtitle}
              <span class="svadmin-steps__subtitle">{item.subTitle ?? item.subtitle}</span>
            {/if}
          </span>
          {#if item.description}<span class="svadmin-steps__description">{item.description}</span>{/if}
        </span>
      </button>
      {#if index < items.length - 1}
        <span class="svadmin-steps__connector" aria-hidden="true" data-filled={stateValue === 'finish' ? 'true' : 'false'}>
          <span class="svadmin-steps__connector-fill"></span>
        </span>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .svadmin-steps { display: flex; gap: var(--svadmin-space-3); margin: 0; padding: 0; list-style: none; }
  .svadmin-steps[data-direction='vertical'] { flex-direction: column; }
  .svadmin-steps__item { position: relative; display: flex; flex: 1; min-width: 0; align-items: flex-start; gap: var(--svadmin-space-2); }
  .svadmin-steps[data-direction='vertical'] .svadmin-steps__item { flex: none; flex-direction: column; gap: var(--svadmin-space-1); }
  .svadmin-steps__action {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: var(--svadmin-space-2);
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: default;
  }
  .svadmin-steps__action:not(:disabled) { cursor: pointer; }
  .svadmin-steps__action:focus-visible {
    outline: var(--svadmin-focus-width) solid color-mix(in oklch, var(--ring) 48%, transparent);
    outline-offset: var(--svadmin-focus-offset);
  }
  .svadmin-steps__indicator {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 0;
    border-radius: 999px;
    background: var(--svadmin-fill-2, var(--muted));
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
    font-weight: 500;
  }
  .svadmin-steps__item[data-status='finish'] .svadmin-steps__indicator { background: var(--primary-light-1, var(--accent)); color: var(--primary); }
  .svadmin-steps__item[data-status='process'] .svadmin-steps__indicator { background: var(--primary); color: var(--primary-foreground); }
  .svadmin-steps__item[data-status='error'] .svadmin-steps__indicator { background: var(--destructive); color: var(--destructive-foreground); }
  .svadmin-steps__text { display: grid; min-width: 0; gap: 0.15rem; }
  /* Official step title is 16px. Only the active step is weight 500. */
  .svadmin-steps__title { color: var(--foreground); font-size: var(--svadmin-text-section); font-weight: 400; line-height: 1.75; }
  .svadmin-steps__item[data-status='process'] .svadmin-steps__title { font-weight: 500; }
  .svadmin-steps__item[data-status='wait'] .svadmin-steps__title { color: var(--muted-foreground); font-weight: 400; }
  .svadmin-steps__subtitle {
    margin-inline-start: 0.5rem;
    font-size: var(--svadmin-text-caption, 0.75rem);
    font-weight: 400;
    color: var(--svadmin-text-3, var(--muted-foreground));
  }
  .svadmin-steps__description { margin-top: 2px; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-steps__connector {
    position: relative;
    flex: 1;
    height: 1px;
    margin-block-start: 0.875rem;
    background: var(--border);
    overflow: hidden;
  }
  .svadmin-steps__connector-fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    width: 0;
    background: var(--primary);
    transition: width 240ms var(--svadmin-motion-easing, cubic-bezier(0.4, 0, 0.2, 1));
  }
  .svadmin-steps__connector[data-filled='true'] .svadmin-steps__connector-fill { width: 100%; }
  .svadmin-steps[data-direction='vertical'] .svadmin-steps__connector { width: 1px; height: 1.5rem; margin: 0 0 0 0.875rem; }
  .svadmin-steps[data-direction='vertical'] .svadmin-steps__connector-fill {
    inset-inline: 0;
    inset-block-start: 0;
    width: 100%;
    height: 0;
    transition: height 240ms var(--svadmin-motion-easing, cubic-bezier(0.4, 0, 0.2, 1));
  }
  .svadmin-steps[data-direction='vertical'] .svadmin-steps__connector[data-filled='true'] .svadmin-steps__connector-fill { height: 100%; }
  @media (prefers-reduced-motion: reduce) {
    .svadmin-steps__connector-fill { transition: none; }
  }
  .svadmin-steps[data-label-placement='vertical'] .svadmin-steps__action { flex-direction: column; }
  .svadmin-steps__item[data-disabled='true'] { opacity: 1; color: var(--svadmin-text-4); }

  /* Small size adjustments */
  .svadmin-steps:is([data-size='small'], [data-size='mini']) .svadmin-steps__indicator {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.75rem;
  }
  .svadmin-steps:is([data-size='small'], [data-size='mini']) .svadmin-steps__title {
    font-size: var(--svadmin-text-body);
    line-height: 1.5rem;
  }
  .svadmin-steps:is([data-size='small'], [data-size='mini']) .svadmin-steps__connector {
    margin-block-start: 0.75rem;
  }
  .svadmin-steps:is([data-size='small'], [data-size='mini'])[data-direction='vertical'] .svadmin-steps__connector {
    margin: 0 0 0 0.75rem;
  }

  /* Dot type adjustments */
  .svadmin-steps[data-type='dot'] .svadmin-steps__indicator {
    width: 0.75rem;
    height: 0.75rem;
    margin-block-start: 0.375rem;
    background: transparent;
    border: 0;
  }
  .svadmin-steps[data-type='dot'] .svadmin-steps__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--svadmin-fill-3, var(--muted));
    transition: all 200ms cubic-bezier(0, 0, 0.2, 1);
  }
  .svadmin-steps[data-type='dot'] .svadmin-steps__item[data-status='process'] .svadmin-steps__dot {
    width: 0.625rem;
    height: 0.625rem;
    background: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
  }
  .svadmin-steps[data-type='dot'] .svadmin-steps__item[data-status='finish'] .svadmin-steps__dot {
    background: var(--primary);
  }
  .svadmin-steps[data-type='dot'] .svadmin-steps__item[data-status='error'] .svadmin-steps__dot {
    background: var(--destructive);
  }
  .svadmin-steps[data-type='dot'] .svadmin-steps__connector {
    margin-block-start: 0.75rem;
  }
  .svadmin-steps[data-type='dot'][data-direction='vertical'] .svadmin-steps__connector {
    margin: 0 0 0 0.375rem;
  }

  @media (max-width: 40rem) {
    .svadmin-steps[data-direction='horizontal'] { flex-direction: column; }
    .svadmin-steps[data-direction='horizontal'] .svadmin-steps__connector { width: 1px; height: 1rem; margin-inline-start: 0.875rem; }
    .svadmin-steps[data-direction='horizontal'] .svadmin-steps__connector-fill {
      inset-inline: 0;
      inset-block-start: 0;
      width: 100%;
      height: 0;
      transition: height 240ms var(--svadmin-motion-easing, cubic-bezier(0.4, 0, 0.2, 1));
    }
    .svadmin-steps[data-direction='horizontal'] .svadmin-steps__connector[data-filled='true'] .svadmin-steps__connector-fill { height: 100%; }
  }
</style>
