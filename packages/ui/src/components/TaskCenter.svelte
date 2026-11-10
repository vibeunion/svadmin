<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Download,
    RotateCw,
    Trash2,
    X,
    Inbox,
  } from '@lucide/svelte';
  import * as Sheet from './ui/sheet/index.js';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export type BackgroundTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  export interface BackgroundTask {
    id: string;
    name: string;
    description?: string;
    status: BackgroundTaskStatus;
    progress?: number; // 0 - 100
    processedCount?: number;
    totalCount?: number;
    createdAt: string | Date;
    updatedAt?: string | Date;
    estimatedSecondsRemaining?: number;
    downloadUrl?: string;
    downloadFileName?: string;
    error?: string;
  }

  export interface TaskCenterProps {
    open?: boolean;
    tasks?: BackgroundTask[];
    title?: string;
    description?: string;
    emptyText?: string;
    showTrigger?: boolean;
    triggerText?: string;
    children?: Snippet;
    onclose?: () => void;
    ondownload?: (task: BackgroundTask) => void;
    onretry?: (task: BackgroundTask) => void | Promise<void>;
    oncancel?: (task: BackgroundTask) => void | Promise<void>;
    onclearcompleted?: () => void | Promise<void>;
    onrefresh?: () => void | Promise<void>;
    class?: string;
  }

  let {
    open = $bindable(false),
    tasks = [],
    title = 'Task Center',
    description = 'Track and manage asynchronous background exports and batch jobs',
    emptyText = 'No background tasks',
    showTrigger = false,
    triggerText = 'Tasks',
    children,
    onclose,
    ondownload,
    onretry,
    oncancel,
    onclearcompleted,
    onrefresh,
    class: className,
  }: TaskCenterProps = $props();

  let activeTab = $state<'all' | 'running' | 'pending' | 'completed' | 'failed'>('all');

  const runningCount = $derived(tasks.filter((t) => t.status === 'running').length);
  const pendingCount = $derived(tasks.filter((t) => t.status === 'pending').length);
  const completedCount = $derived(tasks.filter((t) => t.status === 'completed').length);
  const failedCount = $derived(tasks.filter((t) => t.status === 'failed').length);

  const filteredTasks = $derived.by(() => {
    if (activeTab === 'all') return tasks;
    if (activeTab === 'running') return tasks.filter((t) => t.status === 'running');
    if (activeTab === 'pending') return tasks.filter((t) => t.status === 'pending');
    if (activeTab === 'completed') return tasks.filter((t) => t.status === 'completed');
    if (activeTab === 'failed') return tasks.filter((t) => t.status === 'failed' || t.status === 'cancelled');
    return tasks;
  });

  function formatTime(dateVal: string | Date): string {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDuration(seconds: number | undefined): string {
    if (seconds == null || seconds < 0) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  function handleDownload(task: BackgroundTask) {
    if (ondownload) {
      ondownload(task);
      return;
    }
    if (task.downloadUrl && typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = task.downloadUrl;
      if (task.downloadFileName) {
        a.download = task.downloadFileName;
      }
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
</script>

<div class={cn('inline-block', className)} data-svadmin-component="task-center">
  {#if children}
    <div
      role="button"
      tabindex="0"
      onclick={() => (open = true)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open = true;
        }
      }}
    >
      {@render children()}
    </div>
  {:else if showTrigger}
    <Button
      variant="outline"
      size="sm"
      class="relative flex items-center gap-1.5"
      onclick={() => (open = true)}
      aria-label="Open task center"
      data-svadmin-action="open-task-center"
    >
      <Activity class={cn('h-4 w-4', runningCount > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground')} />
      <span>{triggerText}</span>
      {#if runningCount > 0}
        <span
          class="ml-1 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground"
          data-svadmin-counter="running-tasks"
        >
          {runningCount}
        </span>
      {/if}
    </Button>
  {/if}

  <Sheet.Root bind:open onClose={() => { onclose?.(); }}>
    <Sheet.Content class="w-full sm:max-w-lg flex flex-col p-0">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity class="h-4 w-4 text-primary" />
            {title}
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div class="flex items-center gap-1">
          {#if onrefresh}
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
              onclick={() => onrefresh?.()}
              aria-label="Refresh tasks"
              data-svadmin-action="refresh-tasks"
            >
              <RotateCw class="h-4 w-4" />
            </Button>
          {/if}
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground hover:text-foreground"
            onclick={() => {
              open = false;
              onclose?.();
            }}
            aria-label="Close task center"
            data-svadmin-action="close-task-center"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="px-6 pt-3 pb-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div class="flex items-center gap-1 overflow-x-auto text-xs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            class={cn(
              'px-2.5 py-1 rounded font-medium transition-colors cursor-pointer',
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'all')}
            data-svadmin-tab="all"
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'running'}
            class={cn(
              'px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1',
              activeTab === 'running'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'running')}
            data-svadmin-tab="running"
          >
            Running
            {#if runningCount > 0}
              <span class="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              <span class="text-[10px] bg-primary/10 text-primary px-1 rounded">{runningCount}</span>
            {/if}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            class={cn(
              'px-2.5 py-1 rounded font-medium transition-colors cursor-pointer',
              activeTab === 'pending'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'pending')}
            data-svadmin-tab="pending"
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            class={cn(
              'px-2.5 py-1 rounded font-medium transition-colors cursor-pointer',
              activeTab === 'completed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'completed')}
            data-svadmin-tab="completed"
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'failed'}
            class={cn(
              'px-2.5 py-1 rounded font-medium transition-colors cursor-pointer',
              activeTab === 'failed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'failed')}
            data-svadmin-tab="failed"
          >
            Failed ({failedCount})
          </button>
        </div>

        {#if onclearcompleted && completedCount > 0}
          <Button
            variant="ghost"
            size="sm"
            class="text-xs h-7 text-muted-foreground hover:text-destructive px-2"
            onclick={() => onclearcompleted?.()}
            data-svadmin-action="clear-completed"
          >
            <Trash2 class="h-3 w-3 mr-1" />
            Clear
          </Button>
        {/if}
      </div>

      <!-- Task List Body -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {#if filteredTasks.length === 0}
          <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Inbox class="h-10 w-10 stroke-1 text-muted-foreground/40 mb-3" />
            <p class="text-sm">{emptyText}</p>
          </div>
        {:else}
          {#each filteredTasks as task (task.id)}
            <div
              class={cn(
                'p-3.5 rounded-lg border border-border bg-card transition-all',
                task.status === 'running' && 'border-primary/40 shadow-sm',
                task.status === 'failed' && 'border-destructive/30',
              )}
              data-svadmin-task-id={task.id}
              data-svadmin-task-status={task.status}
            >
              <!-- Card Header -->
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-foreground truncate">
                      {task.name}
                    </span>
                    <!-- Status Badge -->
                    {#if task.status === 'running'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <RotateCw class="h-3 w-3 animate-spin" />
                        Running
                      </span>
                    {:else if task.status === 'pending'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <Clock class="h-3 w-3" />
                        Pending
                      </span>
                    {:else if task.status === 'completed'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">
                        <CheckCircle2 class="h-3 w-3" />
                        Completed
                      </span>
                    {:else if task.status === 'failed'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                        <AlertCircle class="h-3 w-3" />
                        Failed
                      </span>
                    {:else if task.status === 'cancelled'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <XCircle class="h-3 w-3" />
                        Cancelled
                      </span>
                    {/if}
                  </div>
                  {#if task.description}
                    <p class="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  {/if}
                </div>

                <span class="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatTime(task.createdAt)}
                </span>
              </div>

              <!-- Progress Bar -->
              {#if task.status === 'running' || task.status === 'pending'}
                <div class="mt-3 space-y-1.5">
                  <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      class={cn(
                        'h-full bg-primary transition-all duration-300',
                        task.status === 'running' ? 'animate-pulse' : 'opacity-60',
                      )}
                      style="width: {Math.min(100, Math.max(0, task.progress ?? 0))}%"
                      role="progressbar"
                      aria-valuenow={task.progress ?? 0}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {#if task.processedCount != null && task.totalCount != null}
                        {task.processedCount.toLocaleString()} / {task.totalCount.toLocaleString()}
                      {:else}
                        {task.progress ?? 0}%
                      {/if}
                    </span>
                    {#if task.estimatedSecondsRemaining != null && task.status === 'running'}
                      <span>~{formatDuration(task.estimatedSecondsRemaining)} remaining</span>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Error Box -->
              {#if task.status === 'failed' && task.error}
                <div class="mt-2.5 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  {task.error}
                </div>
              {/if}

              <!-- Card Action Footer -->
              <div class="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                <span class="text-muted-foreground text-[11px]">
                  ID: <span class="font-mono">{task.id}</span>
                </span>
                <div class="flex items-center gap-1">
                  {#if task.status === 'completed' && (task.downloadUrl || ondownload)}
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 px-2 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                      onclick={() => handleDownload(task)}
                      data-svadmin-action="download-result"
                    >
                      <Download class="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  {/if}

                  {#if (task.status === 'failed' || task.status === 'cancelled') && onretry}
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 px-2 text-xs"
                      onclick={() => onretry?.(task)}
                      data-svadmin-action="retry-task"
                    >
                      <RotateCw class="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  {/if}

                  {#if (task.status === 'running' || task.status === 'pending') && oncancel}
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onclick={() => oncancel?.(task)}
                      data-svadmin-action="cancel-task"
                    >
                      <XCircle class="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </Sheet.Content>
  </Sheet.Root>
</div>
