<script lang="ts">
  interface Props { current: number; steps?: string[]; class?: string; }
  let { current, steps = ['Setup', 'Verify', 'Recovery'], class: className = '' }: Props = $props();
</script>
<ol class={'grid gap-2 sm:grid-cols-3 ' + className} aria-label="Progress">
  {#each steps as step, index (step)}
    <li class={'flex items-center gap-2 rounded-md border px-3 py-2 text-xs ' + (index < current ? 'border-success/30 bg-success/10 text-success' : index === current ? 'border-primary/30 bg-primary/10 font-medium text-primary' : 'border-border text-muted-foreground')}>
      <span class="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]">{index + 1}</span><span class="truncate">{step}</span>
    </li>
  {/each}
</ol>
