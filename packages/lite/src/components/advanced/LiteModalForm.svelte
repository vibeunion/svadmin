<script lang="ts">
  /**
   * SSR ModalForm — Degraded to a dedicated page redirect.
   * True modals require JS for overlay rendering. In lite mode,
   * this component simply renders a link that navigates to the
   * create/edit page for the resource (a full page load).
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

<!-- In lite mode, modals degrade to a full-page navigation -->
<a href={href} class="lite-btn lite-btn-primary {className}">
  {buttonLabel}
</a>
