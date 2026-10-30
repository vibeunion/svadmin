<script lang="ts">
  interface CollapseItem {
    id: string;
    title: string;
    description?: string;
    content: string;
    open?: boolean;
    disabled?: boolean;
  }

  interface Props {
    items: CollapseItem[];
    label?: string;
  }

  let { items, label = 'Collapsible sections' }: Props = $props();
</script>

<div class="lite-collapse" role="group" aria-label={label}>
  {#each items as item (item.id)}
    <section class="lite-collapse__item" data-open={item.open || undefined} data-disabled={item.disabled || undefined}>
      <a class="lite-collapse__trigger" href={`#${item.id}`}>
        <span>{item.title}</span>
        {#if item.description}<small>{item.description}</small>{/if}
      </a>
      <div class="lite-collapse__body" id={item.id}>{item.content}</div>
    </section>
  {/each}
</div>

<style>
  .lite-collapse { border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; overflow: hidden; }
  .lite-collapse__item + .lite-collapse__item { border-top: 1px solid #E5E6EB; }
  .lite-collapse__trigger { display: block; padding: 12px 16px; color: #1D2129; font-size: 14px; font-weight: 500; text-decoration: none; }
  .lite-collapse__trigger:hover { background: #F7F8FA; text-decoration: none; }
  .lite-collapse__trigger small { margin-left: 8px; color: #86909C; font-size: 12px; font-weight: 400; }
  .lite-collapse__item[data-disabled] .lite-collapse__trigger { color: #C9CDD4; cursor: not-allowed; }
  .lite-collapse__body { display: none; padding: 12px 16px; border-top: 1px solid #F2F3F5; color: #4E5969; font-size: 13px; line-height: 1.6; }
  .lite-collapse__item[data-open] .lite-collapse__body, .lite-collapse__body:target { display: block; }
</style>
