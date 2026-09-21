<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  const i18n = useTranslation();
</script>
<p role="note">{i18n.locale === 'zh-CN' ? '示例资料，不代表当前账户或组织。连接状态仅在本页演示，导出只包含示例数据。' : 'Sample content, not your current account or organization. Connection changes are local previews; exports contain sample data only.'}</p>
