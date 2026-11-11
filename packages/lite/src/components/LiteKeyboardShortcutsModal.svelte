<script lang="ts">
  export interface LiteShortcutItem {
    label: string;
    keys: string[];
    category?: string;
  }

  interface Props {
    shortcuts?: LiteShortcutItem[];
    title?: string;
    class?: string;
  }

  let {
    shortcuts = [
      { label: '全局搜索 / 命令面板', keys: ['Ctrl', 'K'], category: '导航' },
      { label: '保存当前表单', keys: ['Ctrl', 'S'], category: '编辑' },
      { label: '打开快捷键向导', keys: ['?'], category: '系统' },
    ],
    title = '快捷键总览',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-shortcuts-card {className}"
  data-svadmin-component="LiteKeyboardShortcutsModal"
  role="region"
  aria-label={title}
>
  <h4 class="lite-shortcuts-title">{title}</h4>
  <table class="lite-shortcuts-table">
    <tbody>
      {#each shortcuts as item, idx (idx)}
        <tr class="lite-shortcut-row">
          <td class="lite-shortcut-label">{item.label}</td>
          <td class="lite-shortcut-keys">
            {#each item.keys as k, kIdx (kIdx)}
              <kbd class="lite-kbd">{k}</kbd>
            {/each}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .lite-shortcuts-card { border: 1px solid #e5e6eb; border-radius: 8px; background: #ffffff; padding: 16px; }
  .lite-shortcuts-title { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: #1d2129; }
  .lite-shortcuts-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .lite-shortcut-row td { padding: 6px 8px; border-bottom: 1px solid #f2f3f5; }
  .lite-shortcut-label { color: #1d2129; font-weight: 500; }
  .lite-shortcut-keys { text-align: right; }
  .lite-kbd { font-family: monospace; font-size: 11px; background: #f2f3f5; border: 1px solid #e5e6eb; border-radius: 4px; padding: 2px 6px; color: #4e5969; margin-left: 4px; }
</style>
