<script lang="ts">
  import type { ResourceDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';
  import LiteShowField from '../LiteShowField.svelte';
  import LiteListButton from '../buttons/LiteListButton.svelte';
  import LiteEditButton from '../buttons/LiteEditButton.svelte';
  import LiteDeleteButton from '../buttons/LiteDeleteButton.svelte';

  interface Props {
    resource: ResourceDefinition;
    record: Record<string, unknown>;
    basePath?: string;
    canEdit?: boolean;
    canDelete?: boolean;
  }

  let {
    resource,
    record,
    basePath = '/lite',
    canEdit,
    canDelete,
  }: Props = $props();

  let pk = $derived(resource.primaryKey ?? 'id');
  let idStr = $derived(String(record[pk]));
  const showEdit = $derived(canEdit ?? resource.canEdit !== false);
  const showDelete = $derived(canDelete ?? resource.canDelete !== false);
  
  const showFields = $derived(
    resource.fields.filter(f => f.showInShow !== false)
  );
</script>

<div class="lite-page">
  <div class="lite-page-header">
    <h1 class="lite-page-title">{t('common.show') || 'Show'} {resource.label || resource.name} #{idStr}</h1>
    <div class="lite-page-actions">
      {#if showEdit}
        <LiteEditButton resource={resource.name} recordItemId={idStr} {basePath} />
      {/if}
      <LiteListButton resource={resource.name} {basePath} />
      {#if showDelete}
        <LiteDeleteButton resource={resource.name} recordItemId={idStr} redirectUrl={`${basePath}/${resource.name}`} {basePath} />
      {/if}
    </div>
  </div>

  <div class="lite-card" style="padding: 24px;">
    <div class="lite-stack-lg">
      {#each showFields as field, _i (_i)}
        <div>
          <div style="display: block; font-size: 13px; font-weight: 500; color: #64748b; margin-bottom: 8px;">
            {field.label}
          </div>
          <div style="color: #0f172a; font-size: 14px;">
            <LiteShowField {field} value={record[field.key]} />
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
