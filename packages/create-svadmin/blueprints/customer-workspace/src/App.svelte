<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import { resolveAdminConfig } from '@svadmin/app';
  import config from './svadmin.config';
  import { brand, getDesign } from './design.svelte';
  import { CustomerList, CustomerForm, CustomerDetail, CustomerDashboard, ApprovalReview, WorkspaceSettings } from './features/customers';
  const resolved = resolveAdminConfig(config);
  const design = $derived(getDesign());
  const resourcePages = {
    customers: { list: CustomerList, create: CustomerForm, edit: CustomerForm, clone: CustomerForm, show: CustomerDetail },
    followups: { list: CustomerList, create: CustomerForm, edit: CustomerForm },
    approvals: { list: CustomerList, edit: ApprovalReview, show: ApprovalReview },
    workspace_settings: { list: WorkspaceSettings },
  };
</script>

<AdminApp providerBundle={resolved.providers} resources={[...resolved.resources]}
  title={brand.name} locale="zh-CN" themeConfig={design.theme} {resourcePages}
  queryClientDefaultOptions={{ queries: { retry: false } }}>
  {#snippet dashboard()}<CustomerDashboard />{/snippet}
</AdminApp>
