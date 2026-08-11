<script lang="ts">
  /**
   * LiteShow — Detail/view page for a single record.
   * Renders field labels and values in a key-value layout.
   */
  import type { ResourceDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';
  import LiteShowField from './LiteShowField.svelte';

  interface Props {
    record: Record<string, unknown>;
    resource: ResourceDefinition;
    basePath?: string;
    canEdit?: boolean;
  }

  let {
    record,
    resource,
    basePath = '/lite',
    canEdit,
  }: Props = $props();

  let pk = $derived(resource.primaryKey ?? 'id');
  let id = $derived(record[pk]);
  const showEdit = $derived(canEdit ?? resource.canEdit !== false);
  const showFields = $derived(
    resource.fields.filter(f => f.showInShow !== false)
  );
</script>

<div class="lite-card">
  <div class="lite-header">
    <h1>{resource.label} #{id}</h1>
    <div>
      {#if showEdit}
        <a href={`${basePath}/${resource.name}/edit/${id}`} class="lite-btn lite-btn-primary">
          {t('common.edit') || 'Edit'}
        </a>
      {/if}
      <a href={`${basePath}/${resource.name}`} class="lite-btn" style="margin-left:8px;">
        {t('common.backToList') || 'Back to List'}
      </a>
    </div>
  </div>

  <table class="lite-table">
    <tbody>
      {#each showFields as field, _i (_i)}
        {@const value = record[field.key]}
        <tr>
          <td style="width:200px;font-weight:600;color:#64748b;vertical-align:top;">
            {field.label}
          </td>
          <td>
            <LiteShowField {field} {value} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
