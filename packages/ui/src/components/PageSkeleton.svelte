<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Skeleton } from './ui/skeleton';

  export interface PageSkeletonProps {
    type?: 'list' | 'show' | 'form';
    rows?: number;
    ariaLabel?: string;
    class?: string;
  }

  let {
    type = 'list',
    rows = 5,
    ariaLabel = 'Loading page',
    class: className = '',
  }: PageSkeletonProps = $props();
</script>

<div
  data-svadmin-component="PageSkeleton"
  data-type={type}
  aria-busy="true"
  aria-live="polite"
  aria-label={ariaLabel}
  class="w-full space-y-6 {className}"
  out:fade={{ duration: 200 }}
>
  <!-- Header Skeleton -->
  <div class="flex items-center justify-between">
    <div class="space-y-2">
      <Skeleton class="h-8 w-[200px]" />
      <Skeleton class="h-4 w-[300px]" />
    </div>
    {#if type === 'list'}
      <Skeleton class="h-10 w-[120px]" />
    {/if}
  </div>

  <div class="rounded-md border p-4 space-y-4">
    {#if type === 'list'}
      <!-- Table Header -->
      <div class="flex gap-4 border-b pb-4">
        {#each Array(4) as _, _i (_i)}
          <Skeleton class="h-6 flex-1" />
        {/each}
      </div>
      <!-- Table Rows -->
      <div class="space-y-4">
        {#each Array(rows) as _, _i (_i)}
          <div class="flex gap-4">
            <Skeleton class="h-6 flex-1" />
            <Skeleton class="h-6 flex-1" />
            <Skeleton class="h-6 flex-1" />
            <Skeleton class="h-6 flex-1" />
          </div>
        {/each}
      </div>
    {:else if type === 'show'}
      <!-- Key-Value pairs -->
      <div class="space-y-6">
        {#each Array(rows) as _, _i (_i)}
          <div class="space-y-2">
            <Skeleton class="h-4 w-[100px]" />
            <Skeleton class="h-6 w-[250px]" />
          </div>
        {/each}
      </div>
    {:else if type === 'form'}
      <!-- Form Inputs -->
      <div class="space-y-6">
        {#each Array(rows) as _, _i (_i)}
          <div class="space-y-2">
            <Skeleton class="h-4 w-[100px]" />
            <Skeleton class="h-10 w-full max-w-md" />
          </div>
        {/each}
        <div class="pt-4 flex gap-2">
          <Skeleton class="h-10 w-[100px]" />
          <Skeleton class="h-10 w-[100px]" />
        </div>
      </div>
    {/if}
  </div>
</div>
