<script lang="ts">
  import { Clock, Check, Play, Copy } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CronPreset {
    label: string;
    value: string;
    description?: string;
  }

  export interface CronExpressionBuilderProps {
    /** Bound cron string, e.g. "0 9 * * 1-5" (5-part format) */
    value?: string | undefined;
    /** Extra class names */
    class?: string | undefined;
    /** Whether to show next execution preview (default: true) */
    showPreview?: boolean | undefined;
    /** Preset shortcuts */
    presets?: CronPreset[] | undefined;
    /** Change callback */
    onchange?: ((cron: string) => void) | undefined;
  }

  const defaultPresets: CronPreset[] = [
    { label: 'Every Minute', value: '* * * * *', description: 'Triggers every single minute' },
    { label: 'Hourly', value: '0 * * * *', description: 'Triggers at the start of every hour' },
    { label: 'Daily at 00:00', value: '0 0 * * *', description: 'Triggers every day at midnight' },
    { label: 'Daily at 09:00', value: '0 9 * * *', description: 'Triggers every morning at 9:00 AM' },
    { label: 'Workdays at 09:00', value: '0 9 * * 1-5', description: 'Monday to Friday at 9:00 AM' },
    { label: 'Weekly (Mon 00:00)', value: '0 0 * * 1', description: 'Every Monday at midnight' },
    { label: 'Monthly (1st at 00:00)', value: '0 0 1 * *', description: '1st of every month at midnight' },
  ];

  let {
    value = $bindable('* * * * *'),
    class: className = '',
    showPreview = true,
    presets = defaultPresets,
    onchange,
  }: CronExpressionBuilderProps = $props();

  type TabType = 'minute' | 'hour' | 'day' | 'month' | 'week';
  let activeTab = $state<TabType>('minute');

  // 解析当前 cron 字符串各部分
  const parts = $derived.by(() => {
    const raw = (value || '* * * * *').trim().split(/\s+/);
    return {
      minute: raw[0] ?? '*',
      hour: raw[1] ?? '*',
      day: raw[2] ?? '*',
      month: raw[3] ?? '*',
      week: raw[4] ?? '*',
    };
  });

  function updatePart(type: TabType, partVal: string) {
    const p = { ...parts, [type]: partVal };
    const nextCron = `${p.minute} ${p.hour} ${p.day} ${p.month} ${p.week}`;
    value = nextCron;
    onchange?.(nextCron);
  }

  // 快捷套用预设
  function applyPreset(presetVal: string) {
    value = presetVal;
    onchange?.(presetVal);
  }

  // 人类可读语义描述推导
  const humanReadableSummary = $derived.by<string>(() => {
    const { minute, hour, day, month, week } = parts;
    if (minute === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
      return 'Every minute';
    }
    if (minute === '0' && hour === '*' && day === '*' && month === '*' && week === '*') {
      return 'Every hour, at minute 0';
    }
    if (day === '*' && month === '*' && week === '1-5' && !hour.includes('*') && !minute.includes('*')) {
      return `Every workday (Mon-Fri) at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    if (day === '*' && month === '*' && week === '*' && !hour.includes('*') && !minute.includes('*')) {
      return `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    if (day === '*' && month === '*' && week !== '*' && !hour.includes('*') && !minute.includes('*')) {
      return `Every week on day ${week} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    return `Cron rule: [${value}]`;
  });

  // 未来 5 次触发模拟预估
  const nextExecutions = $derived.by<string[]>(() => {
    const list: string[] = [];
    const now = new Date();
    // 简易前瞻推算模拟时间展示
    for (let i = 1; i <= 5; i++) {
      const future = new Date(now.getTime() + i * 3600 * 1000);
      const y = future.getFullYear();
      const m = String(future.getMonth() + 1).padStart(2, '0');
      const d = String(future.getDate()).padStart(2, '0');
      const h = parts.hour === '*' ? String(future.getHours()).padStart(2, '0') : parts.hour.padStart(2, '0');
      const min = parts.minute === '*' ? String(future.getMinutes()).padStart(2, '0') : parts.minute.padStart(2, '0');
      list.push(`${y}-${m}-${d} ${h}:${min}:00`);
    }
    return list;
  });

  let copied = $state(false);
  function copyCron() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    }
  }
</script>

<div
  data-svadmin-component="CronExpressionBuilder"
  class={cn('rounded-md border border-border bg-card p-4 shadow-xs text-xs space-y-4 font-sans', className)}
>
  <!-- Header: Cron Display & Copy -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
    <div class="flex items-center gap-2">
      <Clock class="h-4 w-4 text-primary" />
      <span class="font-semibold text-foreground text-sm">Cron Expression Builder</span>
      <span class="text-muted-foreground font-mono text-xs">({humanReadableSummary})</span>
    </div>

    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1 font-mono text-xs font-medium text-foreground">
        <span>{value}</span>
      </div>
      <button
        type="button"
        onclick={copyCron}
        class="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {#if copied}
          <Check class="h-3 w-3 text-success" />
          <span class="text-success">Copied</span>
        {:else}
          <Copy class="h-3 w-3" />
          <span>Copy</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Common Presets Shortcuts -->
  <div class="space-y-1.5">
    <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
      Common Presets
    </div>
    <div class="flex flex-wrap gap-1.5">
      {#each presets as p (p.value)}
        <button
          type="button"
          onclick={() => applyPreset(p.value)}
          class={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors border',
            value === p.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title={p.description ?? p.value}
        >
          <span>{p.label}</span>
          <span class="font-mono text-[10px] opacity-70">({p.value})</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Segment Tabs -->
  <div class="flex items-center gap-1 border-b border-border/80 pb-2">
    {#each [
      { id: 'minute', label: 'Minute (0-59)', part: parts.minute },
      { id: 'hour', label: 'Hour (0-23)', part: parts.hour },
      { id: 'day', label: 'Day (1-31)', part: parts.day },
      { id: 'month', label: 'Month (1-12)', part: parts.month },
      { id: 'week', label: 'Week (0-6)', part: parts.week },
    ] as tab (tab.id)}
      <button
        type="button"
        onclick={() => { activeTab = tab.id as TabType; }}
        class={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
          activeTab === tab.id
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <span>{tab.label}</span>
        <span class="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] text-foreground font-normal">
          {tab.part}
        </span>
      </button>
    {/each}
  </div>

  <!-- Tab Content Panel -->
  <div class="rounded-lg border border-border/60 bg-background/50 p-3 space-y-3">
    {#if activeTab === 'minute'}
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="minute-mode"
            checked={parts.minute === '*'}
            onchange={() => updatePart('minute', '*')}
            class="text-primary focus:ring-primary"
          />
          <span>Every minute (*)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="minute-mode"
            checked={parts.minute === '0'}
            onchange={() => updatePart('minute', '0')}
            class="text-primary focus:ring-primary"
          />
          <span>At minute 00</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="minute-mode"
            checked={parts.minute === '*/5'}
            onchange={() => updatePart('minute', '*/5')}
            class="text-primary focus:ring-primary"
          />
          <span>Every 5 minutes (*/5)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="minute-mode"
            checked={parts.minute === '*/15'}
            onchange={() => updatePart('minute', '*/15')}
            class="text-primary focus:ring-primary"
          />
          <span>Every 15 minutes (*/15)</span>
        </label>
      </div>
    {:else if activeTab === 'hour'}
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="hour-mode"
            checked={parts.hour === '*'}
            onchange={() => updatePart('hour', '*')}
            class="text-primary focus:ring-primary"
          />
          <span>Every hour (*)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="hour-mode"
            checked={parts.hour === '0'}
            onchange={() => updatePart('hour', '0')}
            class="text-primary focus:ring-primary"
          />
          <span>At midnight (00:00)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="hour-mode"
            checked={parts.hour === '9'}
            onchange={() => updatePart('hour', '9')}
            class="text-primary focus:ring-primary"
          />
          <span>At 09:00 AM</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="hour-mode"
            checked={parts.hour === '*/2'}
            onchange={() => updatePart('hour', '*/2')}
            class="text-primary focus:ring-primary"
          />
          <span>Every 2 hours (*/2)</span>
        </label>
      </div>
    {:else if activeTab === 'day'}
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="day-mode"
            checked={parts.day === '*'}
            onchange={() => updatePart('day', '*')}
            class="text-primary focus:ring-primary"
          />
          <span>Every day (*)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="day-mode"
            checked={parts.day === '1'}
            onchange={() => updatePart('day', '1')}
            class="text-primary focus:ring-primary"
          />
          <span>First day of month (1)</span>
        </label>
      </div>
    {:else if activeTab === 'month'}
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="month-mode"
            checked={parts.month === '*'}
            onchange={() => updatePart('month', '*')}
            class="text-primary focus:ring-primary"
          />
          <span>Every month (*)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="month-mode"
            checked={parts.month === '1,4,7,10'}
            onchange={() => updatePart('month', '1,4,7,10')}
            class="text-primary focus:ring-primary"
          />
          <span>Quarterly (Jan, Apr, Jul, Oct)</span>
        </label>
      </div>
    {:else if activeTab === 'week'}
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="week-mode"
            checked={parts.week === '*'}
            onchange={() => updatePart('week', '*')}
            class="text-primary focus:ring-primary"
          />
          <span>Every day of week (*)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="week-mode"
            checked={parts.week === '1-5'}
            onchange={() => updatePart('week', '1-5')}
            class="text-primary focus:ring-primary"
          />
          <span>Workdays only (Monday to Friday, 1-5)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="week-mode"
            checked={parts.week === '0,6'}
            onchange={() => updatePart('week', '0,6')}
            class="text-primary focus:ring-primary"
          />
          <span>Weekends only (Saturday & Sunday, 0,6)</span>
        </label>
      </div>
    {/if}
  </div>

  <!-- Next 5 Executions Preview -->
  {#if showPreview}
    <div class="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
      <div class="flex items-center gap-1.5 font-semibold text-foreground">
        <Play class="h-3.5 w-3.5 text-primary" />
        <span>Next 5 Estimated Executions</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {#each nextExecutions as nextTime, idx (idx)}
          <div class="flex items-center gap-2 rounded bg-background px-2.5 py-1.5 border border-border/50 font-mono text-[11px] text-muted-foreground">
            <span class="rounded-full bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-bold">#{idx + 1}</span>
            <span class="text-foreground">{nextTime}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
