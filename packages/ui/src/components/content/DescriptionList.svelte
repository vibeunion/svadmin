<script lang="ts">
  export interface DescriptionItem {
    label: string;
    value: string | number;
    description?: string;
    href?: string;
  }
  interface Props {
    items?: DescriptionItem[];
    columns?: 1 | 2;
    class?: string;
  }
  let { items = [], columns = 1, class: className = '' }: Props = $props();
  const columnClass = $derived(columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1');
</script>

<dl class={'grid gap-x-6 gap-y-5 ' + columnClass + ' ' + className}>
  {#each items as item (item.label)}
    <div class="min-w-0">
      <dt class="text-xs font-medium text-muted-foreground">{item.label}</dt>
      <dd class="mt-1 break-words text-sm font-medium text-foreground">
        {#if item.href}<a class="text-primary underline-offset-4 hover:underline" href={item.href}>{item.value}</a>{:else}{item.value}{/if}
      </dd>
      {#if item.description}<p class="mt-1 text-xs text-muted-foreground">{item.description}</p>{/if}
    </div>
  {/each}
</dl>
