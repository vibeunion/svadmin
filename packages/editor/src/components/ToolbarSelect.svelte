<script lang="ts">
  let { value = '', options = [], title = '', onchange }: {
    value?: string;
    options: Array<{ value: string; label: string }>;
    title?: string;
    onchange?: (value: string) => void;
  } = $props();
</script>

<select
  class="svadmin-toolbar-select"
  {value}
  {title}
  aria-label={title}
  onchange={(e) => {
    const target = e.target as HTMLSelectElement;
    onchange?.(target.value);
  }}
>
  {#each options as opt, _i (_i)}
    <option value={opt.value} selected={opt.value === value}>{opt.label}</option>
  {/each}
</select>
