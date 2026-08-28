<script lang="ts">
  import { Badge } from './ui/badge/index.js';
  import { cn } from '../utils.js';

  export interface GanttTask {
    id: string;
    title: string;
    startDay: number; // 0-based offset
    durationDays: number;
    progress?: number; // 0 to 100
    category?: string;
    assignee?: string;
    status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
  }

  interface Props {
    tasks: GanttTask[];
    totalDays?: number;
    dayLabelPrefix?: string;
    onselecttask?: (task: GanttTask) => void;
    class?: string;
  }

  let {
    tasks = [],
    totalDays = 14,
    dayLabelPrefix = 'D',
    onselecttask,
    class: className = '',
  }: Props = $props();

  const days = $derived(
    Array.from({ length: totalDays }, (_, i) => `${dayLabelPrefix}${i + 1}`)
  );

  function getStatusBadgeVariant(status?: string) {
    switch (status) {
      case 'completed':
        return 'bg-success/15 text-success border-success/30';
      case 'delayed':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'in_progress':
        return 'bg-primary/15 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground border-border/40';
    }
  }

  function getBarColor(status?: string) {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'delayed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  }
</script>

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-3', className)}>
  <div class="flex items-center justify-between pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground">
      Project Gantt Schedule <span class="text-muted-foreground font-normal">({tasks.length} tasks / {totalDays} days)</span>
    </div>
  </div>

  <div class="overflow-x-auto rounded-lg border border-border/60">
    <div class="min-w-[700px]">
      <!-- Timeline Header -->
      <div class="flex border-b border-border/60 bg-muted/40 font-semibold text-muted-foreground">
        <div class="w-56 p-2.5 border-r border-border/60 text-left shrink-0">Task Name</div>
        <div class="flex-1 flex">
          {#each days as day (day)}
            <div class="flex-1 p-2 text-center border-r border-border/40 text-[11px] font-mono last:border-r-0">
              {day}
            </div>
          {/each}
        </div>
      </div>

      <!-- Task Rows -->
      <div class="divide-y divide-border/40">
        {#each tasks as task (task.id)}
          {@const leftPct = (task.startDay / totalDays) * 100}
          {@const widthPct = (task.durationDays / totalDays) * 100}
          <div
            role="button"
            tabindex="0"
            class="flex items-center hover:bg-muted/20 transition-colors cursor-pointer"
            onclick={() => onselecttask?.(task)}
            onkeydown={(e) => { if (e.key === 'Enter') onselecttask?.(task); }}
          >
            <!-- Task Info Column -->
            <div class="w-56 p-2.5 border-r border-border/60 flex items-center justify-between gap-2 shrink-0">
              <div class="truncate font-medium text-foreground">{task.title}</div>
              {#if task.status}
                <Badge variant="outline" class={cn('text-[9px] px-1 py-0 uppercase', getStatusBadgeVariant(task.status))}>
                  {task.status}
                </Badge>
              {/if}
            </div>

            <!-- Task Bar Grid Area -->
            <div class="flex-1 relative h-10 flex items-center px-1">
              <!-- Grid vertical guideline background -->
              <div class="absolute inset-0 flex pointer-events-none">
                {#each days as _, idx (idx)}
                  <div class="flex-1 border-r border-border/20 last:border-r-0"></div>
                {/each}
              </div>

              <!-- Bar element -->
              <div
                class={cn(
                  'relative h-6 rounded-md shadow-xs flex items-center justify-between px-2 text-[10px] font-medium overflow-hidden transition-all group hover:brightness-110',
                  getBarColor(task.status)
                )}
                style={`margin-left: ${leftPct}%; width: ${Math.max(widthPct, 4)}%;`}
              >
                <!-- Inner progress fill -->
                {#if task.progress !== undefined}
                  <div
                    class="absolute inset-y-0 left-0 bg-foreground/20 pointer-events-none"
                    style={`width: ${task.progress}%;`}
                  ></div>
                {/if}

                <span class="truncate relative z-10">{task.title}</span>
                {#if task.progress !== undefined}
                  <span class="relative z-10 text-[9px] opacity-90 font-mono">{task.progress}%</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}

        {#if tasks.length === 0}
          <div class="py-8 text-center text-muted-foreground">No schedule tasks available</div>
        {/if}
      </div>
    </div>
  </div>
</div>
