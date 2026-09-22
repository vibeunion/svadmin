<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext, useParsed } from '@svadmin/core';
  import { recordLink } from './workspace-links';

  let { resource, id }: { resource: string; id: string | number } = $props();
  const i18n = useTranslation();
  const context = captureAdminContext();
  const parsed = useParsed();
  const showHref = $derived.by(() => {
    void parsed.params;
    return recordLink(resource, id, context.currentPath());
  });
</script>

<div class="mt-3 flex flex-wrap gap-4 text-sm">
  <a class="font-medium text-primary underline-offset-4 hover:underline" href={showHref}>{i18n.locale === 'zh-CN' ? '查看详情' : 'View details'}</a>
  <a class="font-medium text-primary underline-offset-4 hover:underline" href={`#/${resource}/edit/${encodeURIComponent(id)}`}>{i18n.locale === 'zh-CN' ? '编辑' : 'Edit'}</a>
</div>
