<script lang="ts">
  export interface CommandPaletteItem {
    id: string;
    title: string;
    category?: string;
    description?: string;
    shortcut?: string;
  }

  interface Props {
    placeholder?: string;
    items?: CommandPaletteItem[];
    class?: string;
  }

  let {
    placeholder = '全局快捷命令面板 (SSR 静态列表)',
    items = [
      { id: 'nav-dashboard', title: '运营与财务仪表盘', category: '系统导航', shortcut: 'G D' },
      { id: 'act-new-order', title: '新建采购审批流', category: '快捷操作', shortcut: '⌘ N' },
      { id: 'res-order-88', title: '订单 #ORD-2026-9882', category: '业务实体' },
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-omnibar-box {className}"
  data-svadmin-component="LiteOmnibarCommandPalette"
  role="region"
  aria-label="Global Omnibar Command Palette"
>
  <div class="lite-omnibar-input">
    <span class="lite-search-icon">🔍</span>
    <span class="lite-input-mock">{placeholder}</span>
    <span class="lite-kbd-hint">⌘K</span>
  </div>

  <div class="lite-omnibar-list">
    <div class="lite-items-header">默认常用指令与导航直达 (SSR 静态降级):</div>
    {#each items as item (item.id)}
      <div class="lite-cmd-row">
        <div class="lite-cmd-main">
          <span class="lite-cmd-title">{item.title}</span>
          {#if item.category}
            <span class="lite-cmd-cat">{item.category}</span>
          {/if}
        </div>
        {#if item.shortcut}
          <span class="lite-cmd-shortcut">{item.shortcut}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-omnibar-box {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-omnibar-input {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
    gap: 8px;
  }
  .lite-search-icon { font-size: 12px; }
  .lite-input-mock { flex: 1; color: #86909c; font-size: 12px; }
  .lite-kbd-hint {
    font-size: 10px;
    font-family: monospace;
    background: #ffffff;
    border: 1px solid #e5e6eb;
    padding: 2px 4px;
    border-radius: 3px;
    color: #4e5969;
  }
  .lite-omnibar-list { padding: 8px 12px; }
  .lite-items-header { font-size: 11px; color: #86909c; margin-bottom: 6px; }
  .lite-cmd-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px dashed #f2f3f5;
  }
  .lite-cmd-row:last-child { border-bottom: none; }
  .lite-cmd-main { display: flex; align-items: center; gap: 6px; }
  .lite-cmd-title { font-weight: 500; color: #1d2129; }
  .lite-cmd-cat {
    font-size: 10px;
    color: #86909c;
    background: #f2f3f5;
    padding: 1px 4px;
    border-radius: 2px;
  }
  .lite-cmd-shortcut {
    font-size: 10px;
    font-family: monospace;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    padding: 1px 4px;
    border-radius: 2px;
    color: #4e5969;
  }
</style>
