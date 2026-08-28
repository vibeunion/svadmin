<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    action?: string;
  }

  let {
    field,
    action = '',
  }: Props = $props();
</script>

<span class="lite-column-header-filter">
  <a
    href="{action}?filter_field={field.key}"
    class="lite-filter-icon"
    title="Filter by {field.label}"
  >
    🔍
  </a>
</span>

<style>
  .lite-column-header-filter {
    display: inline-block;
    margin-left: 4px;
  }
  .lite-filter-icon {
    font-size: 11px;
    text-decoration: none;
    opacity: 0.6;
  }
  .lite-filter-icon:hover {
    opacity: 1;
  }
</style>
