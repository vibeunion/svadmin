<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { isExplicitBooleanTrue } from '../../value-normalization';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);

  const checked = $derived(isExplicitBooleanTrue(value));
</script>

{#if mode === 'show'}
  <div>
    <span class="lite-bool {checked ? 'lite-bool-true' : ''}"></span>
    {checked ? '✓ Yes' : '✗ No'}
  </div>
{:else}
  <div class="lite-checkbox-group">
    <input
      type="checkbox"
      name={field.key}
      id={field.key}
      checked={checked}
      value="true"
    />
    <label for={field.key}>
      {field.label || 'Yes'}
    </label>
    <!-- Keep the label adjacent for the CSS checked/focus selector. -->
    <input type="hidden" name={field.key} value="false" />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
