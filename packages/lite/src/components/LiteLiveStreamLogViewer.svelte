<script lang="ts">
  interface LogItem {
    id: string;
    timestamp: string;
    level: string;
    message: string;
  }

  interface Props {
    title?: string;
    logs?: LogItem[];
    class?: string;
  }

  let {
    title = '实时日志控制台',
    logs = [
      { id: '1', timestamp: '08:45:10', level: 'INFO', message: '[Gateway] Inbound HTTP POST /api/v1/orders/create (200 OK)' },
      { id: '2', timestamp: '08:45:11', level: 'WARN', message: '[Redis] Cache miss on key "session:usr_9901"' },
      { id: '3', timestamp: '08:45:12', level: 'ERROR', message: '[NotificationService] Third-party SMS webhook timed out' }
    ],
    class: className = '',
  }: Props = $props();

  function getLevelColor(lvl: string): string {
    if (lvl === 'ERROR') return '#f53f3f';
    if (lvl === 'WARN') return '#ff7d00';
    return '#165dff';
  }
</script>

<div
  class="lite-log-viewer {className}"
  data-svadmin-component="LiteLiveStreamLogViewer"
  role="region"
  aria-label="Live Stream Log Viewer"
>
  <header class="lite-log-header">
    <h4 class="lite-log-title">{title}</h4>
    <span class="lite-log-count">{logs.length} 条日志记录</span>
  </header>

  <div class="lite-log-console">
    {#each logs as log (log.id)}
      <div class="lite-log-line font-mono">
        <span class="lite-log-time">{log.timestamp}</span>
        <span class="lite-log-badge" style="color: {getLevelColor(log.level)};">[{log.level}]</span>
        <span class="lite-log-msg">{log.message}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-log-viewer {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-log-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-log-count { font-size: 11px; color: #86909c; }
  .lite-log-console {
    background: #1e293b;
    color: #f8fafc;
    padding: 12px 14px;
    font-size: 11px;
    overflow-x: auto;
  }
  .lite-log-line { line-height: 1.6; }
  .font-mono { font-family: monospace; }
  .lite-log-time { color: #94a3b8; margin-right: 6px; }
  .lite-log-badge { font-weight: 700; margin-right: 6px; }
  .lite-log-msg { color: #f8fafc; }
</style>
