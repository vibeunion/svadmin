<script lang="ts">
  import { useCan } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Eye, Pencil, PanelRight, Trash2 } from '@lucide/svelte';
  import RowActions, { type RowActionItem } from './RowActions.svelte';
  import TooltipButton from './TooltipButton.svelte';

  let { resourceName, id, canShow, canEdit, canDelete, onShow, onEdit, onQuickEdit, onDelete }: {
    resourceName: string;
    id: string | number;
    canShow: boolean;
    canEdit: boolean;
    canDelete: boolean;
    onShow: () => void;
    onEdit: () => void;
    onQuickEdit: () => void;
    onDelete: () => void;
  } = $props();
  const i18n = useTranslation();
  const show = useCan(() => ({ resource: resourceName, action: 'show', id, queryOptions: { enabled: canShow } }));
  const edit = useCan(() => ({ resource: resourceName, action: 'edit', id, queryOptions: { enabled: canEdit } }));
  const remove = useCan(() => ({ resource: resourceName, action: 'delete', id, queryOptions: { enabled: canDelete } }));
  const actions = $derived<RowActionItem[]>([
    { label: i18n.t('common.quickEdit'), icon: PanelRight, hidden: !canEdit || edit.allowed !== true, onclick: onQuickEdit },
    { label: i18n.t('common.edit'), icon: Pencil, hidden: !canEdit || edit.allowed !== true, onclick: onEdit },
    { label: i18n.t('common.delete'), icon: Trash2, hidden: !canDelete || remove.allowed !== true, danger: true, onclick: onDelete },
  ]);
</script>

<RowActions {actions} maxVisible={0} moreLabel={i18n.t('common.moreActions')}>
  {#if canShow && show.allowed === true}
    <TooltipButton tooltip={i18n.t('common.detail')} variant="ghost" size="icon-sm" onclick={onShow}>
      <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </TooltipButton>
  {/if}
</RowActions>
