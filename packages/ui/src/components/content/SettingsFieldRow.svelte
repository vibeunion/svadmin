<script lang="ts">
  import type { Snippet } from 'svelte';
  import { productSettingsRowRecipe as productSettingsRow } from '../../recipes.js';
  interface Props { label: string; description?: string; control: Snippet; controlId?: string; separated?: boolean; class?: string; }
  let { label, description, control, controlId, separated = false, class: className = '' }: Props = $props();
  const labelId = $props.id();
  const styles = $derived(productSettingsRow({ separated }));
</script>
<div class={styles.root + ' ' + className} data-svadmin-settings-field-row>
  <div class={styles.heading}>
    {#if controlId}
      <label id={labelId} for={controlId} class={styles.label}>{label}</label>
    {:else}
      <p id={labelId} class={styles.label}>{label}</p>
    {/if}
    {#if description}<p id={`${labelId}-description`} class={styles.description}>{description}</p>{/if}
  </div>
  <div class={styles.control} role="group" aria-labelledby={labelId} aria-describedby={description ? `${labelId}-description` : undefined}>{@render control()}</div>
</div>
