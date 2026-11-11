<script lang="ts">
  export type LiteTaskStatus = 'running' | 'pending' | 'completed' | 'failed' | 'cancelled';

  export interface LiteBackgroundTask {
    id: string;
    title: string;
    status: LiteTaskStatus;
    progress?: number;
    processed?: number;
    total?: number;
    error?: string;
    downloadHref?: string;
    cancelAction?: string;
    retryAction?: string;
  }

  interface Props {
    tasks?: LiteBackgroundTask[];
    title?: string;
    emptyText?: string;
    clearAction?: string;
    clearLabel?: string;
    class?: string;
  }

  let {
    tasks = [],
    title = 'Background tasks',
    emptyText = 'No background tasks',
    clearAction,
    clearLabel = 'Clear completed',
    class: className = '',
  }: Props = $props();

  const completedCount = $derived(tasks.filter((task) => task.status === 'completed').length);

  function statusLabel(status: LiteTaskStatus): string {
    switch (status) {
      case 'running': return 'Running';
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
    }
  }

  function boundedProgress(task: LiteBackgroundTask): number {
    if (typeof task.progress === 'number') return Math.max(0, Math.min(100, task.progress));
    if (task.total && task.total > 0 && typeof task.processed === 'number') {
      return Math.max(0, Math.min(100, Math.round((task.processed / task.total) * 100)));
    }
    return task.status === 'completed' ? 100 : 0;
  }
</script>

<section class="lite-task-center lite-card {className}" aria-label={title}>
  <header>
    <div>
      <h2>{title}</h2>
      <p>{tasks.length} task{tasks.length === 1 ? '' : 's'}{completedCount ? ` · ${completedCount} completed` : ''}</p>
    </div>
    {#if clearAction && completedCount > 0}
      <form method="POST" action={clearAction}>
        <button type="submit" class="lite-task-secondary">{clearLabel}</button>
      </form>
    {/if}
  </header>

  {#if tasks.length === 0}
    <p class="lite-task-empty" role="status">{emptyText}</p>
  {:else}
    <table class="lite-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Status</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each tasks as task (task.id)}
          <tr data-task-id={task.id} data-status={task.status}>
            <td>
              <strong>{task.title}</strong>
              {#if task.error}<span class="lite-task-error">{task.error}</span>{/if}
            </td>
            <td><span class="lite-task-status" data-status={task.status}>{statusLabel(task.status)}</span></td>
            <td>
              <progress max="100" value={boundedProgress(task)} aria-label={`${task.title} progress`}></progress>
              <span class="lite-task-progress-text">
                {boundedProgress(task)}%{typeof task.processed === 'number' && typeof task.total === 'number'
                  ? ` · ${task.processed} / ${task.total}`
                  : ''}
              </span>
            </td>
            <td class="lite-task-actions">
              {#if task.downloadHref}<a href={task.downloadHref}>Download</a>{/if}
              {#if task.retryAction}
                <form method="POST" action={task.retryAction}><button type="submit" class="lite-task-link">Retry</button></form>
              {/if}
              {#if task.cancelAction && (task.status === 'running' || task.status === 'pending')}
                <form method="POST" action={task.cancelAction}><button type="submit" class="lite-task-link">Cancel</button></form>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .lite-task-center { padding: 16px; }
  .lite-task-center header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .lite-task-center header > form { margin-left: 12px; }
  .lite-task-center header h2 { margin: 0; color: #1d2129; font-size: 16px; }
  .lite-task-center header p { margin: 4px 0 0; color: #4e5969; font-size: 12px; }
  .lite-task-empty { margin: 0; padding: 20px; color: #86909c; text-align: center; }
  .lite-task-error { display: block; margin-top: 3px; color: #f53f3f; font-size: 11px; }
  .lite-task-status { display: inline-block; padding: 2px 6px; border-radius: 999px; background: #f2f3f5; color: #4e5969; font-size: 11px; }
  .lite-task-status[data-status='running'] { background: #e8f3ff; color: #165dff; }
  .lite-task-status[data-status='pending'] { background: #fff7e8; color: #d25f00; }
  .lite-task-status[data-status='completed'] { background: #e8ffea; color: #00b42a; }
  .lite-task-status[data-status='failed'] { background: #ffece8; color: #f53f3f; }
  .lite-task-status[data-status='cancelled'] { background: #f2f3f5; color: #86909c; }
  .lite-task-center progress { width: 100%; height: 6px; }
  .lite-task-progress-text { display: block; margin-top: 3px; color: #86909c; font-size: 11px; }
  .lite-task-actions { white-space: nowrap; }
  .lite-task-actions form { display: inline; }
  .lite-task-link { padding: 0; border: 0; background: none; color: #165dff; font: inherit; font-size: 12px; cursor: pointer; }
  .lite-task-secondary { padding: 5px 9px; border: 1px solid #e5e6eb; border-radius: 4px; background: #fff; color: #4e5969; font-size: 11px; cursor: pointer; }
</style>
