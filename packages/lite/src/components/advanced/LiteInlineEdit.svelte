<script lang="ts">
  /**
   * SSR InlineEdit — Degraded to a show-value + edit-link pattern.
   * True inline editing requires JS for focus management, key events,
   * and async save. In lite mode, we display the value as static text
   * and provide a small "edit" link that navigates to the edit page.
   */
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value: unknown;
    editUrl?: string;
  }

  let { field, value, editUrl }: Props = $props();

  const displayValue = $derived(
    value == null ? '—' : String(value)
  );
</script>

<span class="lite-inline-sm" style="display: inline-flex; align-items: center;">
  <span>{displayValue}</span>
  {#if editUrl}
    <a
      href={editUrl}
      style="font-size: 11px; color: #6366f1; text-decoration: none;"
      title="Edit {field.label}"
    >✎</a>
  {/if}
</span>
