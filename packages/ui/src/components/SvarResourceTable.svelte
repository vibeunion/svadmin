<script lang="ts">
  import { captureAdminContext, captureAuthSession, type Filter, type Sort } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { ComponentProps } from 'svelte';
  import SvarDataGrid from './SvarDataGrid.svelte';
  import SvarResourceTableView from './SvarResourceTableView.svelte';

  export interface SvarResourceTableProps {
    Grid: ComponentProps<typeof SvarDataGrid>['Grid'];
    Theme: ComponentProps<typeof SvarDataGrid>['Theme'];
    resourceName: string;
    pageSize?: number;
    filters?: readonly Filter[];
    initialSorters?: readonly Sort[];
    height?: number;
    freezeLeft?: number;
    density?: 'compact' | 'comfortable';
    childrenKey?: string;
    /** 用于不经过 core 登录/租户接口的宿主身份变化；必须是非敏感版本号。 */
    dataScopeKey?: string | number;
  }
  let {
    Grid, Theme, resourceName, pageSize = 25, filters = [], initialSorters = [],
    height = 420, freezeLeft = 0, density = 'comfortable', childrenKey, dataScopeKey = 0,
  }: SvarResourceTableProps = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const owner = $derived.by(() => {
    const auth = captureAuthSession(context.authProvider);
    // 作用域变化时销毁网格及其查询控件，避免旧租户筛选、展开或选择状态流入新页面。
    return {
      provider: context.getDataProviderForResource(resourceName),
      resourceName,
      tenant: context.tenantCacheKey?.__svadminTenant,
      authKey: auth.cacheKey,
      available: auth.available,
      access: context.accessControlProvider,
      dataScopeKey,
    };
  });
</script>

{#key owner}
  {#if owner.available}
    <SvarResourceTableView
      {Grid} {Theme} {resourceName} {pageSize} {filters} {initialSorters}
      {height} {freezeLeft} {density} {dataScopeKey}
      {...childrenKey === undefined ? {} : { childrenKey }}
    />
  {:else}
    <p role="status">{i18n.locale.startsWith('zh') ? '当前会话不可读取数据' : 'Data is unavailable for the current session'}</p>
  {/if}
{/key}
