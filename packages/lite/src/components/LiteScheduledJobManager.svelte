<script lang="ts">
  interface Job {
    id: string;
    name: string;
    cronExpression: string;
    status: 'running' | 'idle' | 'disabled' | 'failed';
    lastRunAt?: string;
    nextRunAt?: string;
  }

  interface Props {
    title?: string;
    jobs?: Job[];
    class?: string;
  }

  let {
    title = '定时任务与计划调度管理',
    jobs = [
      { id: 'job_01', name: '每日数据汇总快照', cronExpression: '0 2 * * *', status: 'idle', lastRunAt: '2026-11-11 02:00:00', nextRunAt: '2026-11-12 02:00:00' },
      { id: 'job_02', name: '离线账单自动结算', cronExpression: '0 0 1 * *', status: 'idle', lastRunAt: '2026-11-01 00:00:00', nextRunAt: '2026-12-01 00:00:00' },
      { id: 'job_03', name: '审计日志冷备归档', cronExpression: '0 */6 * * *', status: 'running', lastRunAt: '2026-11-11 18:00:00', nextRunAt: '2026-11-12 00:00:00' },
      { id: 'job_04', name: '临时测试数据清理', cronExpression: '0 4 * * 0', status: 'disabled', lastRunAt: '2026-11-08 04:00:00', nextRunAt: '—' }
    ],
    class: className = '',
  }: Props = $props();

  function getStatusStyle(st: string): { label: string; color: string; bg: string } {
    switch (st) {
      case 'running': return { label: '运行中', color: '#165dff', bg: '#e8f3ff' };
      case 'failed': return { label: '执行失败', color: '#f53f3f', bg: '#ffece8' };
      case 'disabled': return { label: '已停用', color: '#86909c', bg: '#f2f3f5' };
      default: return { label: '就绪等待', color: '#00b42a', bg: '#e8ffea' };
    }
  }
</script>

<div
  class="lite-scheduler-matrix {className}"
  data-svadmin-component="LiteScheduledJobManager"
  role="region"
  aria-label="Scheduled Job Manager"
>
  <header class="lite-scheduler-header">
    <h4 class="lite-scheduler-title">{title}</h4>
    <span class="lite-scheduler-count">{jobs.length} 项定时作业</span>
  </header>

  <div class="lite-scheduler-table-wrap">
    <table class="lite-scheduler-table">
      <thead>
        <tr>
          <th>任务名称</th>
          <th>Cron 调度表达式</th>
          <th>状态</th>
          <th>上次执行</th>
          <th>下次预定</th>
        </tr>
      </thead>
      <tbody>
        {#each jobs as j (j.id)}
          {@const st = getStatusStyle(j.status)}
          <tr>
            <td class="lite-job-name">{j.name}</td>
            <td><code class="lite-cron-exp">{j.cronExpression}</code></td>
            <td>
              <span class="lite-job-status" style="color: {st.color}; background: {st.bg};">
                {st.label}
              </span>
            </td>
            <td class="lite-time-text">{j.lastRunAt ?? '—'}</td>
            <td class="lite-time-text">{j.nextRunAt ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-scheduler-matrix {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-scheduler-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-scheduler-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-scheduler-count { font-size: 11px; color: #86909c; }
  .lite-scheduler-table-wrap { overflow-x: auto; }
  .lite-scheduler-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-scheduler-table th {
    padding: 8px 12px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    color: #4e5969;
    font-weight: 600;
  }
  .lite-scheduler-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
    color: #1d2129;
  }
  .lite-job-name { font-weight: 600; }
  .lite-cron-exp { font-family: monospace; font-size: 11px; background: #f2f3f5; padding: 2px 4px; border-radius: 3px; color: #165dff; }
  .lite-job-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; display: inline-block; }
  .lite-time-text { font-family: monospace; color: #4e5969; font-size: 10px; }
</style>
