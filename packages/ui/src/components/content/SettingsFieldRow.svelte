<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productSettingsRowRecipe as productSettingsRow } from '../../recipes.js';
  interface Props { label: string; description?: string; control: Snippet; separated?: boolean; class?: string; }
  let { label, description, control, separated = false, class: className = '' }: Props = $props();
  const styles = $derived(productSettingsRow({ separated }));
</script>
<div class={styles.root + ' ' + className} data-svadmin-settings-field-row>
  <div class={styles.heading}>
    <p class={styles.label}>{label}</p>
    {#if description}<p class={styles.description}>{description}</p>{/if}
  </div>
  <div class={styles.control}>{@render control()}</div>
</div>
