<script lang="ts">
  interface StepItem {
    title: string;
    description?: string;
    href?: string;
    disabled?: boolean;
  }

  interface Props {
    items: StepItem[];
    current?: number;
    status?: 'wait' | 'process' | 'finish' | 'error';
    direction?: 'horizontal' | 'vertical';
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    items,
    current = 0,
    status = 'process',
    direction = 'horizontal',
    label = 'Steps',
    class: className = '',
  }: Props = $props();

  function state(index: number): string {
    if (index < current) return 'finish';
    if (index === current) return status === 'error' ? 'error' : status === 'finish' ? 'finish' : 'process';
    return 'wait';
  }
</script>

<ol class="lite-steps {className}" data-direction={direction} aria-label={label}>
  {#each items as item, index (item.title)}
    {@const stateValue = state(index)}
    <li class="lite-steps__item" data-status={stateValue} data-disabled={item.disabled || undefined}>
      <span class="lite-steps__indicator" aria-hidden="true">{stateValue === 'finish' ? '✓' : stateValue === 'error' ? '!' : index + 1}</span>
      <span class="lite-steps__text">
        {#if item.href && !item.disabled}<a href={item.href}>{item.title}</a>{:else}<strong>{item.title}</strong>{/if}
        {#if item.description}<small>{item.description}</small>{/if}
      </span>
    </li>
  {/each}
</ol>

<style>
  .lite-steps { display: flex; margin: 0; padding: 0; list-style: none; }
  .lite-steps[data-direction='vertical'] { flex-direction: column; }
  .lite-steps__item { display: flex; flex: 1; align-items: flex-start; min-width: 0; }
  .lite-steps__indicator { display: inline-grid; flex: 0 0 26px; place-items: center; width: 26px; height: 26px; border: 1px solid #C9CDD4; border-radius: 999px; background: #fff; color: #86909C; font-size: 12px; font-weight: 600; }
  .lite-steps__item[data-status='finish'] .lite-steps__indicator { border-color: #00B42A; background: #E8FFEA; color: #009A29; }
  .lite-steps__item[data-status='process'] .lite-steps__indicator { border-color: #165DFF; background: #E8F3FF; color: #165DFF; }
  .lite-steps__item[data-status='error'] .lite-steps__indicator { border-color: #F53F3F; background: #FFECE8; color: #F53F3F; }
  .lite-steps__item[data-disabled] { opacity: 0.55; }
  .lite-steps__text { display: block; min-width: 0; color: #1D2129; font-size: 13px; }
  .lite-steps__text a { color: #165DFF; }
  .lite-steps__text small { color: #86909C; font-size: 12px; }

  .lite-steps > .lite-steps__item + .lite-steps__item { margin-left: 12px; }
  .lite-steps__indicator { margin-right: 8px; }
  .lite-steps__text > * + * { margin-top: 2px; }
</style>
