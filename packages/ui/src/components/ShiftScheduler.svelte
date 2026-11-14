<script lang="ts">
  import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    Briefcase,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface ShiftType {
    id: string;
    name: string;
    code: string;
    colorToken?: 'primary' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate' | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    hours: number;
    isRest?: boolean | undefined;
  }

  export interface StaffMember {
    id: string;
    name: string;
    code?: string | undefined;
    department?: string | undefined;
    avatar?: string | undefined;
  }

  export interface ShiftAssignment {
    staffId: string;
    date: string; // YYYY-MM-DD
    shiftId: string;
  }

  export interface ShiftConflictAlert {
    staffId: string;
    date?: string | undefined;
    type: 'overtime' | 'fatigue';
    message: string;
  }

  export interface ShiftSchedulerProps {
    /** 参与排班人员列表 */
    staffList: StaffMember[];
    /** 可选班次类型定义 */
    shiftTypes: ShiftType[];
    /** 初始排班结果 */
    assignments?: ShiftAssignment[] | undefined;
    /** 起始基准日期 (YYYY-MM-DD)，默认今天所在的周一 */
    startDate?: string | undefined;
    /** 每周最大合规出勤工时上限，默认 40 */
    maxWeeklyHours?: number | undefined;
    /** 最大连续上班天数上限，默认 6 */
    maxConsecutiveDays?: number | undefined;
    /** 排班变动回调 */
    onchange?: ((assignments: ShiftAssignment[]) => void) | undefined;
    /** 是否只读禁用 */
    disabled?: boolean | undefined;
    class?: string | undefined;
  }

  let {
    staffList = [],
    shiftTypes = [],
    assignments,
    startDate,
    maxWeeklyHours = 40,
    maxConsecutiveDays = 6,
    onchange,
    disabled = false,
    class: className = '',
  }: ShiftSchedulerProps = $props();

  // 获取周一基准日期
  function getMonday(dateStr?: string): Date {
    const d = dateStr ? new Date(dateStr) : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  let baseDate = $state<Date>(getMonday());
  let currentAssignments = $state<ShiftAssignment[]>([]);
  let selectedShiftId = $state<string>('');

  $effect(() => {
    if (startDate) {
      baseDate = getMonday(startDate);
    }
  });

  $effect(() => {
    if (assignments) {
      currentAssignments = [...assignments];
    }
  });

  $effect(() => {
    if (shiftTypes.length > 0 && !selectedShiftId) {
      selectedShiftId = shiftTypes[0]?.id ?? '';
    }
  });

  // 7 天排班周期日期
  const weekDays = $derived.by(() => {
    const days: { dateStr: string; dayLabel: string; dateNum: number; isWeekend: boolean }[] = [];
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push({
        dateStr: formatDateStr(d),
        dayLabel: labels[i] ?? '',
        dateNum: d.getDate(),
        isWeekend: i >= 5,
      });
    }
    return days;
  });

  // 日期快速导航
  function handlePrevWeek() {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    baseDate = d;
  }

  function handleNextWeek() {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    baseDate = d;
  }

  function handleTodayWeek() {
    baseDate = getMonday();
  }

  // 获取人员在指定日期的班次
  function getShift(staffId: string, dateStr: string): ShiftType | undefined {
    const item = currentAssignments.find((a) => a.staffId === staffId && a.date === dateStr);
    if (!item) return undefined;
    return shiftTypes.find((s) => s.id === item.shiftId);
  }

  // 单元格点击切换或填充选中的班次
  function handleCellClick(staffId: string, dateStr: string) {
    if (disabled) return;
    const existingIndex = currentAssignments.findIndex((a) => a.staffId === staffId && a.date === dateStr);

    let next = [...currentAssignments];
    if (existingIndex >= 0) {
      const current = next[existingIndex];
      // 如果当前已经是选中的班次，则点击清除该班次
      if (current && current.shiftId === selectedShiftId) {
        next.splice(existingIndex, 1);
      } else if (selectedShiftId) {
        next[existingIndex] = { staffId, date: dateStr, shiftId: selectedShiftId };
      }
    } else if (selectedShiftId) {
      next.push({ staffId, date: dateStr, shiftId: selectedShiftId });
    }

    currentAssignments = next;
    onchange?.(next);
  }

  // 快捷整周填报：为员工一键排周一到周五的工作班
  function handleBatchFillStaff(staffId: string) {
    if (disabled) return;
    const workShift = shiftTypes.find((s) => !s.isRest) ?? shiftTypes[0];
    const restShift = shiftTypes.find((s) => s.isRest);
    if (!workShift) return;

    let next = currentAssignments.filter((a) => a.staffId !== staffId);
    weekDays.forEach((wd) => {
      const shiftToAssign = wd.isWeekend && restShift ? restShift : workShift;
      next.push({ staffId, date: wd.dateStr, shiftId: shiftToAssign.id });
    });

    currentAssignments = next;
    onchange?.(next);
  }

  // 一键清空员工本周排班
  function handleClearStaff(staffId: string) {
    if (disabled) return;
    const dateSet = new Set(weekDays.map((w) => w.dateStr));
    const next = currentAssignments.filter((a) => !(a.staffId === staffId && dateSet.has(a.date)));
    currentAssignments = next;
    onchange?.(next);
  }

  // 统计每位员工本周工时与合规风险
  const staffStats = $derived.by(() => {
    const statsMap = new Map<
      string,
      { totalHours: number; workDays: number; restDays: number; alerts: ShiftConflictAlert[] }
    >();

    staffList.forEach((staff) => {
      let totalHours = 0;
      let workDays = 0;
      let restDays = 0;
      let consecutiveWork = 0;
      let maxConsecutive = 0;
      const alerts: ShiftConflictAlert[] = [];

      weekDays.forEach((wd) => {
        const shift = getShift(staff.id, wd.dateStr);
        if (shift && !shift.isRest) {
          totalHours += shift.hours;
          workDays += 1;
          consecutiveWork += 1;
          if (consecutiveWork > maxConsecutive) maxConsecutive = consecutiveWork;
        } else {
          restDays += 1;
          consecutiveWork = 0;
        }
      });

      if (totalHours > maxWeeklyHours) {
        alerts.push({
          staffId: staff.id,
          type: 'overtime',
          message: `本周排班 ${totalHours}h，超出 ${maxWeeklyHours}h 上限`,
        });
      }

      if (maxConsecutive > maxConsecutiveDays) {
        alerts.push({
          staffId: staff.id,
          type: 'fatigue',
          message: `连续出勤 ${maxConsecutive} 天，超过上限 ${maxConsecutiveDays} 天`,
        });
      }

      statsMap.set(staff.id, { totalHours, workDays, restDays, alerts });
    });

    return statsMap;
  });

  // 全员汇总
  const summary = $derived.by(() => {
    let allHours = 0;
    let allWorkDays = 0;
    let totalAlerts = 0;

    staffStats.forEach((v) => {
      allHours += v.totalHours;
      allWorkDays += v.workDays;
      totalAlerts += v.alerts.length;
    });

    return { allHours, allWorkDays, totalAlerts };
  });

  function getShiftBadgeClass(token?: string) {
    switch (token) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'slate':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-primary/10 text-primary border-primary/30';
    }
  }
</script>

<div
  class={cn(
    'flex flex-col rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all',
    className
  )}
  data-svadmin-component="ShiftScheduler"
>
  <!-- 头部周期与班次画笔工具条 -->
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-4">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <CalendarIcon class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-sm font-semibold tracking-tight">企业多班次轮值排班日程表</h3>
        <p class="text-xs text-muted-foreground">
          {weekDays[0]?.dateStr} 至 {weekDays[6]?.dateStr} 轮值周计划
        </p>
      </div>
    </div>

    <!-- 日期周期前后翻页 -->
    <div class="flex items-center gap-2">
      <div class="flex items-center rounded-md border border-border bg-background shadow-sm">
        <button
          type="button"
          class="p-1.5 text-muted-foreground hover:text-foreground"
          onclick={handlePrevWeek}
          title="上一周"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
          onclick={handleTodayWeek}
        >
          本周
        </button>
        <button
          type="button"
          class="p-1.5 text-muted-foreground hover:text-foreground"
          onclick={handleNextWeek}
          title="下一周"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <!-- 全局工时合规提示 -->
      <div
        class={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
          summary.totalAlerts === 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        )}
      >
        {#if summary.totalAlerts === 0}
          <CheckCircle2 class="h-3.5 w-3.5" />
          <span>全场合规 (共 {summary.allHours}h)</span>
        {:else}
          <AlertTriangle class="h-3.5 w-3.5" />
          <span>存在 {summary.totalAlerts} 项排班预警</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- 班次类型快捷画笔选择器 -->
  <div class="flex flex-wrap items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5 text-xs">
    <span class="font-medium text-muted-foreground">当前指派班次：</span>
    {#each shiftTypes as st (st.id)}
      <button
        type="button"
        class={cn(
          'flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-all shadow-xs',
          getShiftBadgeClass(st.colorToken),
          selectedShiftId === st.id ? 'ring-2 ring-primary ring-offset-1' : 'opacity-80 hover:opacity-100'
        )}
        onclick={() => (selectedShiftId = st.id)}
      >
        <span>{st.name}</span>
        <span class="rounded bg-background/50 px-1 py-0.2 text-[10px] font-mono">{st.hours}h</span>
        {#if st.startTime && st.endTime}
          <span class="text-[10px] opacity-75">{st.startTime}-{st.endTime}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- 主排班网格 -->
  <div class="overflow-x-auto">
    <table class="w-full min-w-[800px] border-collapse text-left text-xs">
      <thead>
        <tr class="border-b border-border/60 bg-muted/40 font-medium text-muted-foreground">
          <th class="w-48 px-4 py-2.5">员工与部门</th>
          {#each weekDays as wd}
            <th class={cn('px-2 py-2.5 text-center', wd.isWeekend ? 'bg-muted/60 text-foreground' : '')}>
              <div>{wd.dayLabel}</div>
              <div class="font-mono text-[11px] opacity-75">{wd.dateNum}日</div>
            </th>
          {/each}
          <th class="w-32 px-3 py-2.5 text-center">工时统计</th>
          <th class="w-24 px-3 py-2.5 text-center">快捷操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40">
        {#each staffList as staff (staff.id)}
          {@const st = staffStats.get(staff.id)}
          {@const hasAlert = Boolean(st && st.alerts.length > 0)}
          <tr class={cn('hover:bg-muted/20 transition-colors', hasAlert ? 'bg-amber-500/5' : '')}>
            <!-- 人员信息 -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  {staff.name.slice(0, 1)}
                </div>
                <div>
                  <div class="flex items-center gap-1.5 font-medium text-foreground">
                    <span>{staff.name}</span>
                    {#if staff.code}
                      <code class="text-[10px] text-muted-foreground">{staff.code}</code>
                    {/if}
                  </div>
                  {#if staff.department}
                    <div class="text-[11px] text-muted-foreground">{staff.department}</div>
                  {/if}
                </div>
              </div>
            </td>

            <!-- 7 天排班单元格 -->
            {#each weekDays as wd}
              {@const shift = getShift(staff.id, wd.dateStr)}
              <td class={cn('p-1 text-center', wd.isWeekend ? 'bg-muted/20' : '')}>
                <button
                  type="button"
                  disabled={disabled}
                  class={cn(
                    'h-11 w-full rounded border transition-all flex flex-col items-center justify-center p-1',
                    shift
                      ? getShiftBadgeClass(shift.colorToken)
                      : 'border-dashed border-border/80 hover:border-primary/50 hover:bg-muted/40'
                  )}
                  onclick={() => handleCellClick(staff.id, wd.dateStr)}
                  title={shift ? `${shift.name} (${shift.hours}h)` : '点击分配班次'}
                >
                  {#if shift}
                    <span class="font-semibold text-[11px] leading-tight">{shift.name}</span>
                    <span class="text-[9px] opacity-75 font-mono">{shift.hours}h</span>
                  {:else}
                    <span class="text-[11px] text-muted-foreground/60">-</span>
                  {/if}
                </button>
              </td>
            {/each}

            <!-- 本周工时汇总与告警 -->
            <td class="px-3 py-2 text-center">
              <div class="font-mono text-xs font-bold text-foreground">
                {st?.totalHours ?? 0}h
              </div>
              <div class="text-[10px] text-muted-foreground">
                {st?.workDays ?? 0}天出勤
              </div>
              {#if hasAlert && st}
                <div class="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400" title={st.alerts.map((a) => a.message).join('; ')}>
                  <AlertTriangle class="h-3 w-3" />
                  <span>超标</span>
                </div>
              {/if}
            </td>

            <!-- 快捷批量操作 -->
            <td class="px-3 py-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onclick={() => handleBatchFillStaff(staff.id)}
                  title="一键排工作日标准班"
                >
                  <Sparkles class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onclick={() => handleClearStaff(staff.id)}
                  title="清空本周"
                >
                  <RotateCcw class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
