<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { GANTT_LIMITS, validateGantt } from '@svadmin/core/gantt';
  export interface GanttTask {
    id: string;
    title: string;
    startDay: number;
    durationDays: number;
    progress?: number;
    status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
    dependencies?: string[];
    milestone?: boolean;
  }

  interface Props {
    tasks?: GanttTask[];
    totalDays?: number;
    dayLabelPrefix?: string;
    loading?: boolean;
    error?: string | undefined;
    retryHref?: string;
    ariaLabel?: string;
    class?: string;
  }

  let {
    tasks = [],
    totalDays = 14,
    dayLabelPrefix = 'D',
    loading = false,
    error,
    retryHref,
    ariaLabel,
    class: className = '',
  }: Props = $props();

  const days = $derived(
    Array.from({ length: Number.isSafeInteger(totalDays) && totalDays > 0 && totalDays <= GANTT_LIMITS.days ? totalDays : 0 }, (_, i) => `${dayLabelPrefix}${i + 1}`)
  );
  const i18n = useTranslation();
  const validationError = $derived(validateGantt(loading || error ? [] : tasks, totalDays));
  const displayError = $derived(error || (validationError ? i18n.t(`gantt.${validationError}`) : ''));
  const safeRetryHref = $derived(retryHref?.startsWith('/') && !/^\/[\\/]/.test(retryHref)
    && !retryHref.includes('\\')
    && ![...retryHref].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) ? retryHref : undefined);
</script>

<div class="sv-lite-gantt-container {className}" aria-busy={loading}>
  <div class="sv-lite-gantt-title">
    <strong>{i18n.t('gantt.title')}</strong> ({i18n.t('gantt.summary', { tasks: tasks.length, days: totalDays })})
  </div>

  {#if loading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if error && safeRetryHref}<a href={safeRetryHref}>{i18n.t('common.retry')}</a>{/if}
  {:else if tasks.length === 0}
    <div role="status">{i18n.t('gantt.noData')}</div>
  {:else}
  <table class="sv-lite-gantt-table" aria-label={ariaLabel ?? i18n.t('gantt.title')}>
    <thead>
      <tr>
        <th scope="col" class="sv-lite-th-task">{i18n.t('gantt.task')}</th>
        <th scope="col" class="sv-lite-th-status">{i18n.t('gantt.status')}</th>
        {#each days as day (day)}
          <th scope="col" class="sv-lite-th-day">{day}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each tasks as task (task.id)}
        <tr>
          <th scope="row" class="sv-lite-td-task" aria-label={`${task.title}, ${task.milestone
            ? i18n.t('gantt.milestone', { day: task.startDay + 1 })
            : i18n.t('gantt.range', { start: task.startDay + 1, end: task.startDay + task.durationDays })}`}>{task.title}</th>
          <td class="sv-lite-td-status">
            <span class="sv-lite-gantt-badge sv-lite-{task.status ?? 'planned'}">{i18n.t(`gantt.${task.status ?? 'planned'}`)}</span>
          </td>
          {#each days as _, dIdx (dIdx)}
            {@const isCovered = dIdx >= task.startDay && dIdx < task.startDay + task.durationDays}
            {@const isMilestone = task.milestone && dIdx === task.startDay}
            <td aria-label={isMilestone ? `${task.title}, ${i18n.t('gantt.milestone', { day: dIdx + 1 })}`
              : isCovered ? `${task.title}, ${days[dIdx]}, ${i18n.t(`gantt.${task.status ?? 'planned'}`)}` : undefined}
              class="sv-lite-td-cell {isCovered ? 'sv-lite-cell-active sv-lite-bg-' + (task.status ?? 'planned') : ''}">
              {#if isCovered && dIdx === task.startDay && task.progress !== undefined}
                <span class="sv-lite-cell-progress">{task.progress}%</span>
              {/if}
              {#if isMilestone}<span aria-hidden="true">◆</span>{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {/if}
</div>

<style>
  .sv-lite-gantt-container {
    display: block;
    border: 1px solid #E5E6EB;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
    overflow-x: auto;
  }
  .sv-lite-gantt-title {
    margin-bottom: 10px;
    font-size: 13px;
    color: #1D2129;
  }
  .sv-lite-gantt-table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
  }
  .sv-lite-gantt-table th, .sv-lite-gantt-table td {
    border: 1px solid #E5E6EB;
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
    background-color: #F7F8FA;
    color: #4E5969;
  }
  .sv-lite-gantt-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    text-transform: none;
  }
  .sv-lite-completed {
    background-color: #E8FFEA;
    color: #009A29;
  }
  .sv-lite-delayed {
    background-color: #FFECE8;
    color: #CB272D;
  }
  .sv-lite-in_progress {
    background-color: #E8F3FF;
    color: #0E42D2;
  }
  .sv-lite-planned {
    background-color: #F2F3F5;
    color: #4E5969;
  }
  .sv-lite-cell-active {
    background-color: #165DFF;
    color: #ffffff;
  }
  .sv-lite-bg-completed {
    background-color: #00B42A;
  }
  .sv-lite-bg-delayed {
    background-color: #F53F3F;
  }
  .sv-lite-bg-in_progress {
    background-color: #165DFF;
  }
  .sv-lite-bg-planned {
    background-color: #86909C;
  }
  .sv-lite-cell-progress {
    font-size: 12px;
    font-weight: bold;
  }
</style>
