<script lang="ts">
  interface TimelineEntry {
    id: string;
    title: string;
    description?: string;
    time?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    active?: boolean;
  }

  interface Props {
    items: TimelineEntry[];
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { items, label = 'Timeline', class: className = '' }: Props = $props();
</script>

<ol class="lite-timeline {className}" aria-label={label}>
  {#each items as item (item.id)}
    <li class="lite-timeline__item" data-tone={item.tone ?? 'neutral'} data-active={item.active || undefined}>
      <span class="lite-timeline__marker" aria-hidden="true"></span>
      <div>
        {#if item.time}<time>{item.time}</time>{/if}
        <p>{item.title}</p>
        {#if item.description}<small>{item.description}</small>{/if}
      </div>
    </li>
  {/each}
</ol>

<style>
  .lite-timeline { display: block; margin: 0; padding: 0; list-style: none; }
  .lite-timeline__item { position: relative; padding-left: 24px; }
  .lite-timeline__item + .lite-timeline__item { margin-top: 16px; }
  .lite-timeline__item:not(:last-child)::before { position: absolute; top: 16px; bottom: -16px; left: 5px; width: 1px; background: #E5E6EB; content: ''; }
  .lite-timeline__marker { position: absolute; top: 5px; left: 0; width: 11px; height: 11px; border: 2px solid #C9CDD4; border-radius: 999px; background: #fff; }
  .lite-timeline__item[data-tone='info'] .lite-timeline__marker { border-color: #165DFF; }
  .lite-timeline__item[data-tone='success'] .lite-timeline__marker { border-color: #00B42A; }
  .lite-timeline__item[data-tone='warning'] .lite-timeline__marker { border-color: #FF7D00; }
  .lite-timeline__item[data-tone='danger'] .lite-timeline__marker { border-color: #F53F3F; }
  .lite-timeline__item[data-active] .lite-timeline__marker { background: #165DFF; border-color: #165DFF; }
  .lite-timeline__item time { color: #86909C; font-size: 12px; }
  .lite-timeline__item p { margin: 0; color: #1D2129; font-size: 14px; font-weight: 600; }
  .lite-timeline__item small { display: block; margin-top: 4px; color: #4E5969; font-size: 13px; line-height: 1.6; }
</style>
