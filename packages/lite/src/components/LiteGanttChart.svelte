<script lang="ts">
  export interface GanttTask {
    id: string;
    title: string;
    startDay: number;
    durationDays: number;
    progress?: number;
    status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
  }

  interface Props {
    tasks?: GanttTask[];
    totalDays?: number;
    dayLabelPrefix?: string;
    class?: string;
  }

  let {
    tasks = [],
    totalDays = 14,
    dayLabelPrefix = 'D',
    class: className = '',
  }: Props = $props();

  const days = $derived(
    Array.from({ length: totalDays }, (_, i) => `${dayLabelPrefix}${i + 1}`)
  );
</script>

<div class="sv-lite-gantt-container {className}">
  <div class="sv-lite-gantt-title">
    <strong>Project Schedule</strong> ({tasks.length} tasks / {totalDays} days)
  </div>

  <table class="sv-lite-gantt-table">
    <thead>
      <tr>
        <th class="sv-lite-th-task">Task</th>
        <th class="sv-lite-th-status">Status</th>
        {#each days as day (day)}
          <th class="sv-lite-th-day">{day}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each tasks as task (task.id)}
        <tr>
          <td class="sv-lite-td-task">{task.title}</td>
          <td class="sv-lite-td-status">
            <span class="sv-lite-gantt-badge sv-lite-{task.status ?? 'planned'}">{task.status ?? 'planned'}</span>
          </td>
          {#each days as _, dIdx (dIdx)}
            {@const isCovered = dIdx >= task.startDay && dIdx < task.startDay + task.durationDays}
            <td class="sv-lite-td-cell {isCovered ? 'sv-lite-cell-active sv-lite-bg-' + (task.status ?? 'planned') : ''}">
              {#if isCovered && dIdx === task.startDay && task.progress !== undefined}
                <span class="sv-lite-cell-progress">{task.progress}%</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .sv-lite-gantt-container {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
    overflow-x: auto;
  }
  .sv-lite-gantt-title {
    margin-bottom: 10px;
    font-size: 13px;
    color: #0f172a;
  }
  .sv-lite-gantt-table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
  }
  .sv-lite-gantt-table th, .sv-lite-gantt-table td {
    border: 1px solid #e2e8f0;
    padding: 6px;
  }
  .sv-lite-th-task, .sv-lite-td-task {
    text-align: left;
    min-width: 140px;
    font-weight: 500;
  }
  .sv-lite-th-day {
    min-width: 28px;
    font-size: 10px;
    background-color: #f8fafc;
    color: #64748b;
  }
  .sv-lite-gantt-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    text-transform: uppercase;
  }
  .sv-lite-completed {
    background-color: #dcfce7;
    color: #166534;
  }
  .sv-lite-delayed {
    background-color: #fee2e2;
    color: #991b1b;
  }
  .sv-lite-in_progress {
    background-color: #e0e7ff;
    color: #3730a3;
  }
  .sv-lite-planned {
    background-color: #f1f5f9;
    color: #475569;
  }
  .sv-lite-cell-active {
    background-color: #818cf8;
    color: #ffffff;
  }
  .sv-lite-bg-completed {
    background-color: #4ade80;
  }
  .sv-lite-bg-delayed {
    background-color: #f87171;
  }
  .sv-lite-bg-in_progress {
    background-color: #6366f1;
  }
  .sv-lite-bg-planned {
    background-color: #94a3b8;
  }
  .sv-lite-cell-progress {
    font-size: 9px;
    font-weight: bold;
  }
</style>
