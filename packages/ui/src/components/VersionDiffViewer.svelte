<script lang="ts">
  import { untrack } from 'svelte';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Columns2, AlignJustify } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    oldTitle?: string;
    newTitle?: string;
    viewMode?: 'split' | 'unified';
    fieldLabels?: Record<string, string>;
    class?: string;
  }

  let {
    oldValue = {},
    newValue = {},
    oldTitle = 'Previous Version',
    newTitle = 'Current Version',
    viewMode = 'split',
    fieldLabels = {},
    class: className = '',
  }: Props = $props();

  let mode = $state<'split' | 'unified'>(untrack(() => viewMode));

  interface FieldDiff {
    key: string;
    label: string;
    oldVal: unknown;
    newVal: unknown;
    status: 'added' | 'removed' | 'modified' | 'unchanged';
  }

  const diffList = $derived.by<FieldDiff[]>(() => {
    const oldObj = oldValue || {};
    const newObj = newValue || {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    return allKeys.map((key) => {
      const hasOld = key in oldObj && oldObj[key] !== undefined;
      const hasNew = key in newObj && newObj[key] !== undefined;
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      let status: FieldDiff['status'] = 'unchanged';
      if (!hasOld && hasNew) {
        status = 'added';
      } else if (hasOld && !hasNew) {
        status = 'removed';
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        status = 'modified';
      }

      return {
        key,
        label: fieldLabels[key] || key,
        oldVal,
        newVal,
        status,
      };
    });
  });

  const modifiedCount = $derived(diffList.filter((d) => d.status !== 'unchanged').length);

  function formatValue(val: unknown): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
</script>

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-2cd02d11d1af', className)}>
  <!-- Header & Toolbar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-56796a90bec5 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-967d113a1451">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <h4 class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Record Comparison</h4>
      <Badge variant="outline" class="svadmin-u-d058ca6de60f">
        {modifiedCount} change{modifiedCount === 1 ? '' : 's'}
      </Badge>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
      <Button
        variant={mode === 'split' ? 'secondary' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-d5eab218aa34"
        onclick={() => { mode = 'split'; }}
      >
        <Columns2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        Side by Side
      </Button>
      <Button
        variant={mode === 'unified' ? 'secondary' : 'ghost'}
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-d5eab218aa34"
        onclick={() => { mode = 'unified'; }}
      >
        <AlignJustify class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        Unified
      </Button>
    </div>
  </div>

  {#if mode === 'split'}
    <!-- Split Side-by-Side View -->
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-3746131ec018 svadmin-u-d2c3932343f5 svadmin-u-359090c2d529">
      <div class="svadmin-u-eb6e8b881acd svadmin-u-8a25a995eb8e svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">{oldTitle}</div>
      <div class="svadmin-u-eb6e8b881acd svadmin-u-8a25a995eb8e svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">{newTitle}</div>
    </div>

    <div class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258 svadmin-u-359090c2d529">
      {#each diffList as diff (diff.key)}
        {@const isDiff = diff.status !== 'unchanged'}
        <div class={cn('svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-3746131ec018 svadmin-u-08b5607c7258 svadmin-u-ceb69a6b0e5f', isDiff ? 'svadmin-u-46daeb0b661f' : '')}>
          <!-- Left Column -->
          <div class={cn('svadmin-u-eb6e8b881acd svadmin-u-da7c36cd8867', diff.status === 'removed' ? 'svadmin-u-7a0854fdbc30' : '')}>
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-2689f3958069">
              <span>{diff.label}</span>
              {#if diff.status === 'removed'}
                <Badge variant="outline" class="svadmin-u-c698f77c9ba5 svadmin-u-811148b13d1e svadmin-u-f0c1e65bd6f2 svadmin-u-1dc571a3609f">Deleted</Badge>
              {/if}
            </div>
            <div class={cn('svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-170cee3ff4e4', diff.status === 'removed' ? 'line-through svadmin-u-811148b13d1e' : 'svadmin-u-d4108abe6359')}>
              {formatValue(diff.oldVal)}
            </div>
          </div>

          <!-- Right Column -->
          <div class={cn('svadmin-u-eb6e8b881acd svadmin-u-da7c36cd8867', diff.status === 'added' ? 'svadmin-u-338625ff877e' : diff.status === 'modified' ? 'svadmin-u-a909a196be82' : '')}>
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-2689f3958069">
              <span>{diff.label}</span>
              {#if diff.status === 'added'}
                <Badge variant="outline" class="svadmin-u-4cf5af8d25d3 svadmin-u-76747e5e02ff svadmin-u-95b7dea5a67f svadmin-u-1dc571a3609f">Added</Badge>
              {:else if diff.status === 'modified'}
                <Badge variant="outline" class="svadmin-u-d9c3c520f7d5 svadmin-u-3a4ff758c2ab svadmin-u-610bcc1bb506 svadmin-u-1dc571a3609f">Modified</Badge>
              {/if}
            </div>
            <div class={cn('svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-170cee3ff4e4', diff.status === 'added' ? 'svadmin-u-76747e5e02ff svadmin-u-2689f3958069' : diff.status === 'modified' ? 'svadmin-u-3a4ff758c2ab svadmin-u-2689f3958069' : 'svadmin-u-d4108abe6359')}>
              {formatValue(diff.newVal)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Unified List View -->
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258 svadmin-u-359090c2d529">
      {#each diffList as diff (diff.key)}
        <div class="svadmin-u-eb6e8b881acd svadmin-u-6f7e013d6499">
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
            <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{diff.label}</span>
            {#if diff.status === 'added'}
              <Badge variant="outline" class="svadmin-u-4cf5af8d25d3 svadmin-u-76747e5e02ff svadmin-u-95b7dea5a67f svadmin-u-1dc571a3609f">Added</Badge>
            {:else if diff.status === 'removed'}
              <Badge variant="outline" class="svadmin-u-c698f77c9ba5 svadmin-u-811148b13d1e svadmin-u-f0c1e65bd6f2 svadmin-u-1dc571a3609f">Removed</Badge>
            {:else if diff.status === 'modified'}
              <Badge variant="outline" class="svadmin-u-d9c3c520f7d5 svadmin-u-3a4ff758c2ab svadmin-u-610bcc1bb506 svadmin-u-1dc571a3609f">Modified</Badge>
            {:else}
              <Badge variant="outline" class="svadmin-u-1dc571a3609f svadmin-u-bfa603190748">Unchanged</Badge>
            {/if}
          </div>

          {#if diff.status === 'modified'}
            <div class="svadmin-u-da7c36cd8867 svadmin-u-421ac2be5045 svadmin-u-b00f43c30c2b svadmin-u-7660b450905a svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f">
              <div class="svadmin-u-811148b13d1e line-through">- {formatValue(diff.oldVal)}</div>
              <div class="svadmin-u-76747e5e02ff svadmin-u-2689f3958069">+ {formatValue(diff.newVal)}</div>
            </div>
          {:else if diff.status === 'added'}
            <div class="svadmin-u-421ac2be5045 svadmin-u-17a9f7af2265 svadmin-u-7660b450905a svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f svadmin-u-76747e5e02ff">
              + {formatValue(diff.newVal)}
            </div>
          {:else if diff.status === 'removed'}
            <div class="svadmin-u-421ac2be5045 svadmin-u-43928fcc832f svadmin-u-7660b450905a svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f svadmin-u-811148b13d1e line-through">
              - {formatValue(diff.oldVal)}
            </div>
          {:else}
            <div class="svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f svadmin-u-bfa603190748">
              {formatValue(diff.newVal)}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
