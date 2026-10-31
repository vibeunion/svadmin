<script lang="ts">
  /**
   * SSR DrawerForm — Degraded to a dedicated page redirect.
   * Side drawers require JS for sliding panel rendering. In lite mode,
   * this component works identically to LiteModalForm: a plain link.
   */
  import type { ResourceDefinition } from '@svadmin/core';
  import { t } from '@svadmin/core/i18n';

  interface Props {
    resource: ResourceDefinition;
    mode?: 'create' | 'edit';
    recordId?: string | number;
    basePath?: string;
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    resource,
    mode = 'create',
    recordId,
    basePath = '/lite',
    label,
    class: className = '',
  }: Props = $props();

  const href = $derived(
    mode === 'create'
      ? `${basePath}/${resource.name}/create`
      : `${basePath}/${resource.name}/edit/${recordId}`
  );

  const buttonLabel = $derived(
    label ??
    (mode === 'create'
      ? `${t('common.create') || 'Create'} ${resource.label || resource.name}`
      : `${t('common.edit') || 'Edit'} ${resource.label || resource.name}`)
  );
</script>

<a href={href} class="lite-btn lite-btn-outline {className}">
  {buttonLabel}
</a>
