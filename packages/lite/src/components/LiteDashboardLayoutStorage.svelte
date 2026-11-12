<script lang="ts">
  export interface DashboardPreset {
    id: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    role?: string;
    itemsCount?: number;
  }

  interface Props {
    presets?: DashboardPreset[];
    currentPresetId?: string;
    class?: string;
  }

  let {
    presets = [
      { id: 'p1', name: '高管经营全景大屏', description: '重点监控季度 GMV 与 SLA', isDefault: true, role: 'CEO', itemsCount: 4 },
      { id: 'p2', name: '财务月结与对账大屏', description: '聚焦大额采购单与资金划转', isDefault: false, role: 'CFO', itemsCount: 3 },
    ],
    currentPresetId = 'p1',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-layout-storage {className}"
  data-svadmin-component="LiteDashboardLayoutStorage"
  role="region"
  aria-label="Dashboard Layout Storage"
>
  <div class="lite-storage-header">
    <span class="lite-storage-icon">📁</span>
    <span class="lite-storage-title">大屏排版预设方案库 (SSR 静态列表)</span>
  </div>

  <div class="lite-presets-list">
    {#each presets as p}
      <div class="lite-preset-card" class:lite-preset-active={p.id === currentPresetId}>
        <div class="lite-preset-title-row">
          <span class="lite-preset-name">{p.name}</span>
          {#if p.isDefault}<span class="lite-preset-badge">默认</span>{/if}
          {#if p.id === currentPresetId}<span class="lite-preset-active-tag">[当前激活]</span>{/if}
        </div>
        {#if p.description}<p class="lite-preset-desc">{p.description}</p>{/if}
        <div class="lite-preset-footer">
          <span>角色: {p.role ?? '通用'}</span>
          <span>{p.itemsCount ?? 4} 个小部件</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-layout-storage {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
    padding: 10px 14px;
  }
  .lite-storage-header { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #1d2129; margin-bottom: 8px; }
  .lite-storage-icon { font-size: 14px; }
  .lite-presets-list { display: flex; flex-direction: column; gap: 6px; }
  .lite-preset-card {
    border: 1px solid #f2f3f5;
    background: #fafafa;
    border-radius: 4px;
    padding: 8px 10px;
  }
  .lite-preset-active {
    border-color: #165dff;
    background: #e8f3ff;
  }
  .lite-preset-title-row { display: flex; align-items: center; gap: 6px; }
  .lite-preset-name { font-weight: 600; color: #1d2129; }
  .lite-preset-badge { font-size: 9px; background: #ffffff; color: #165dff; padding: 1px 4px; border: 1px solid #165dff; border-radius: 2px; }
  .lite-preset-active-tag { font-size: 10px; color: #165dff; font-weight: 600; }
  .lite-preset-desc { font-size: 11px; color: #86909c; margin: 4px 0; }
  .lite-preset-footer { display: flex; justify-content: space-between; font-size: 10px; color: #86909c; }
</style>
