<script lang="ts">
  import { captureAdminContext, captureAuthSession, type Filter, type Sort } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { ComponentProps } from 'svelte';
  import SvarDataGrid from './SvarDataGrid.svelte';
  import SvarResourceTableView from './SvarResourceTableView.svelte';
  import type { SvarLazyTree } from './svar-grid-resource-loading.js';
  import type { SvarValueFormat } from './svar-grid-interactions.js';

  export interface SvarResourceTableProps {
    Grid: ComponentProps<typeof SvarDataGrid>['Grid'];
    Theme: ComponentProps<typeof SvarDataGrid>['Theme'];
    resourceName: string;
    pageSize?: number;
    filters?: readonly Filter[];
    initialSorters?: readonly Sort[];
    height?: number;
    freezeLeft?: number;
    freezeRight?: number;
    /** 高级读取仍使用资源契约、Provider 和核心查询缓存。 */
    loadingMode?: 'page' | 'window' | 'infinite';
    lazyTree?: SvarLazyTree;
    density?: 'compact' | 'comfortable';
    childrenKey?: string;
    dataScopeKey?: string | number;
    disabled?: boolean;
    /** 所有写入能力默认关闭，必须由可信宿主开启。 */
    editable?: boolean;
    selectable?: boolean;
    batchUpdate?: boolean;
    batchDelete?: boolean;
    exportable?: boolean;
    savedViews?: boolean;
    /** 非敏感的用户/租户偏好分区；省略时只保存在本次挂载的内存。 */
    preferenceScopeKey?: string;
    /** 显式导入 AutoTable 的作用域视图，不修改原视图。 */
    migrateAutoTableViews?: boolean;
    deleteVariables?: unknown;
    formats?: Readonly<Record<string, { format: SvarValueFormat; currency?: string }>>;
  }
  let props: SvarResourceTableProps = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const owner = $derived.by(() => {
    const auth = captureAuthSession(context.authProvider);
    return {
      provider: context.getDataProviderForResource(props.resourceName),
      resourceName: props.resourceName, contract: context.getResource(props.resourceName).contract,
      tenant: context.tenantCacheKey?.__svadminTenant,
      authKey: auth.cacheKey, available: auth.available,
      access: context.accessControlProvider, dataScopeKey: props.dataScopeKey,
      preferenceScopeKey: props.preferenceScopeKey,
    };
  });
</script>

{#key owner}
  {#if owner.available}
    <SvarResourceTableView {...props} />
  {:else}
    <p role="status">{i18n.locale.startsWith('zh') ? '当前会话不可读取数据' : 'Data is unavailable for the current session'}</p>
  {/if}
{/key}
