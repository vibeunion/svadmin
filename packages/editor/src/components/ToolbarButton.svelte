<script lang="ts">
  import type { Snippet } from 'svelte';

  let { active = false, disabled = false, title = '', onclick, children }: {
    active?: boolean;
    disabled?: boolean;
    title?: string;
    onclick?: () => void;
    children: Snippet;
  } = $props();
</script>

<button
  type="button"
  class="svadmin-toolbar-btn"
  data-active={active}
  {disabled}
  {title}
  aria-pressed={active}
  aria-label={title}
  onclick={(e) => {
    e.preventDefault();
    onclick?.();
  }}
>
  {@render children()}
</button>
