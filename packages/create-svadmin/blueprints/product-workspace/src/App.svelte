<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import { resolveAdminConfig } from '@svadmin/app';
  import config from './svadmin.config';
  import { brand, getDesign } from './design.svelte';
  import { productMenu } from './generated/navigation';
  import { productResources } from './generated/resources';
  import { productPageRoutes } from './generated/page-routes';

  const resolved = resolveAdminConfig(config);
  const design = $derived(getDesign());
</script>

<AdminApp
  providerBundle={resolved.providers}
  resources={[...productResources]}
  menu={productMenu}
  pageRoutes={productPageRoutes}
  title={brand.name}
  locale="zh-CN"
  themeConfig={design.theme}
  queryClientDefaultOptions={{ queries: { retry: false } }}
/>
