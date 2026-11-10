<script lang="ts">
  import { cn } from '../utils.js';

  export type ProSkeletonType = 'table' | 'descriptions' | 'form' | 'list' | 'result';

  export interface ProSkeletonProps {
    /** Structural layout template type */
    type?: ProSkeletonType;
    /** Whether skeleton elements have pulsing animation */
    active?: boolean;
    /** Number of rows to render */
    rows?: number;
    /** Number of columns for table or descriptions */
    columns?: number;
    /** Whether to include avatar skeleton in list or result */
    avatar?: boolean;
    /** Number of statistic KPI cards to render at the top */
    statistic?: number;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    type = 'table',
    active = true,
    rows = 5,
    columns = 4,
    avatar = false,
    statistic = 0,
    class: className = '',
  }: ProSkeletonProps = $props();

  const pulseClass = $derived(active ? 'animate-pulse' : '');
</script>

<div
  data-svadmin-component="ProSkeleton"
  data-type={type}
  data-active={active}
  class={cn('w-full space-y-4 select-none', pulseClass, className)}
  aria-busy="true"
  aria-live="polite"
>
  <!-- KPI Statistic Cards Top Section -->
  {#if statistic > 0}
    <div
      class="grid gap-4"
      style={`grid-template-columns: repeat(${statistic}, minmax(0, 1fr));`}
    >
      {#each Array(statistic) as _, idx (idx)}
        <div class="rounded-xl border border-border bg-card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="h-3.5 w-20 rounded-[4px] bg-muted"></div>
            <div class="h-4 w-4 rounded-[4px] bg-muted/70"></div>
          </div>
          <div class="h-7 w-28 rounded-[4px] bg-muted"></div>
          <div class="h-3 w-36 rounded-[4px] bg-muted/60"></div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Table Skeleton -->
  {#if type === 'table'}
    <div class="rounded-xl border border-border bg-card overflow-hidden p-4 space-y-4">
      <!-- Table Toolbar -->
      <div class="flex items-center justify-between gap-4 pb-2">
        <div class="h-8 w-48 rounded-[4px] bg-muted"></div>
        <div class="flex items-center gap-2">
          <div class="h-8 w-20 rounded-[4px] bg-muted"></div>
          <div class="h-8 w-20 rounded-[4px] bg-muted"></div>
        </div>
      </div>

      <!-- Table Header -->
      <div
        class="grid gap-4 border-y border-border py-3 bg-muted/30 px-3"
        style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr));`}
      >
        {#each Array(columns) as _, cIdx (cIdx)}
          <div class="h-3.5 w-16 rounded-[4px] bg-muted"></div>
        {/each}
      </div>

      <!-- Table Body Rows -->
      <div class="divide-y divide-border/60">
        {#each Array(rows) as _, rIdx (rIdx)}
          <div
            class="grid gap-4 py-3.5 px-3 items-center"
            style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr));`}
          >
            {#each Array(columns) as _, cIdx (cIdx)}
              <div
                class="h-3 rounded-[4px] bg-muted/80"
                style={`width: ${50 + ((rIdx * 17 + cIdx * 23) % 40)}%;`}
              ></div>
            {/each}
          </div>
        {/each}
      </div>

      <!-- Table Pagination Bar -->
      <div class="flex items-center justify-between pt-3 border-t border-border">
        <div class="h-3 w-28 rounded-[4px] bg-muted/70"></div>
        <div class="flex items-center gap-1.5">
          <div class="h-7 w-7 rounded-[4px] bg-muted"></div>
          <div class="h-7 w-7 rounded-[4px] bg-muted"></div>
          <div class="h-7 w-7 rounded-[4px] bg-muted"></div>
          <div class="h-7 w-7 rounded-[4px] bg-muted"></div>
        </div>
      </div>
    </div>

  <!-- Descriptions Skeleton -->
  {:else if type === 'descriptions'}
    <div class="rounded-xl border border-border bg-card p-5 space-y-5">
      <!-- Title Bar -->
      <div class="flex items-center justify-between border-b border-border pb-3">
        <div class="h-5 w-36 rounded-[4px] bg-muted"></div>
        <div class="h-7 w-16 rounded-[4px] bg-muted/70"></div>
      </div>

      <!-- Descriptions Grid -->
      <div
        class="grid gap-4"
        style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr));`}
      >
        {#each Array(rows * columns) as _, idx (idx)}
          <div class="space-y-1.5">
            <div class="h-3 w-16 rounded-[4px] bg-muted/60"></div>
            <div
              class="h-4 rounded-[4px] bg-muted"
              style={`width: ${60 + (idx % 3) * 15}%;`}
            ></div>
          </div>
        {/each}
      </div>
    </div>

  <!-- Form Skeleton -->
  {:else if type === 'form'}
    <div class="rounded-xl border border-border bg-card p-6 space-y-5 max-w-2xl">
      {#each Array(rows) as _, rIdx (rIdx)}
        <div class="space-y-2">
          <div class="h-3.5 w-24 rounded-[4px] bg-muted"></div>
          <div class="h-9 w-full rounded-[4px] bg-muted/60"></div>
        </div>
      {/each}

      <div class="flex items-center gap-3 pt-3">
        <div class="h-9 w-24 rounded-[4px] bg-primary/40"></div>
        <div class="h-9 w-20 rounded-[4px] bg-muted"></div>
      </div>
    </div>

  <!-- List Skeleton -->
  {:else if type === 'list'}
    <div class="rounded-xl border border-border bg-card divide-y divide-border/60">
      {#each Array(rows) as _, rIdx (rIdx)}
        <div class="flex items-start gap-4 p-4">
          {#if avatar}
            <div class="h-10 w-10 shrink-0 rounded-full bg-muted"></div>
          {/if}
          <div class="flex-1 space-y-2">
            <div class="h-4 w-40 rounded-[4px] bg-muted"></div>
            <div class="h-3 w-full rounded-[4px] bg-muted/70"></div>
            <div class="h-3 w-3/4 rounded-[4px] bg-muted/60"></div>
          </div>
        </div>
      {/each}
    </div>

  <!-- Result Skeleton -->
  {:else if type === 'result'}
    <div class="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center space-y-4">
      <div class="h-18 w-18 rounded-full bg-muted/80"></div>
      <div class="h-6 w-48 rounded-[4px] bg-muted"></div>
      <div class="h-3.5 w-72 rounded-[4px] bg-muted/70"></div>
      <div class="h-3.5 w-56 rounded-[4px] bg-muted/50"></div>
      <div class="flex items-center gap-3 pt-4">
        <div class="h-9 w-24 rounded-[4px] bg-primary/40"></div>
        <div class="h-9 w-20 rounded-[4px] bg-muted"></div>
      </div>
    </div>
  {/if}
</div>
