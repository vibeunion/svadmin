<script lang="ts">
  import { cn } from '../../utils.js';

  export interface DescriptionItem {
    label: string;
    value: unknown;
    description?: string;
    href?: string;
    span?: number;
  }

  interface Props {
    items?: DescriptionItem[];
    columns?: 1 | 2 | 3 | 4;
    layout?: 'vertical' | 'horizontal';
    bordered?: boolean;
    density?: 'compact' | 'comfortable';
    class?: string;
  }

  let {
    items = [],
    columns = 1,
    layout = 'vertical',
    bordered = false,
    density = 'comfortable',
    class: className = '',
  }: Props = $props();

  const isCompact = $derived(density === 'compact');
  const isHorizontal = $derived(layout === 'horizontal');

  function spanClass(span: number | undefined): string {
    if (!span || span <= 1) return '';
    if (span >= 4) return 'sm:col-span-4';
    if (span === 3) return 'sm:col-span-3';
    return 'sm:col-span-2';
  }

  const columnClass = $derived.by(() => {
    switch (columns) {
      case 4:
        return 'svadmin-u-d7c8339810d3 svadmin-u-e00ad81645a2 svadmin-u-9a638cfe8212 svadmin-u-4558bce6d8c0';
      case 3:
        return 'svadmin-u-d7c8339810d3 svadmin-u-e00ad81645a2 svadmin-u-19d9b25e8fae';
      case 2:
        return 'svadmin-u-d7c8339810d3 svadmin-u-e00ad81645a2';
      default:
        return 'grid-cols-1';
    }
  });
</script>

{#if bordered}
  <div class={cn('svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-d4108abe6359', className)}>
    <dl class={cn('svadmin-u-f3c543ad5fe9 svadmin-u-fa6acbf81d74 svadmin-u-d2c3932343f5 svadmin-u-4d9da416df16', columnClass)}>
      {#each items as item, idx (item.label ? `${item.label}-${idx}` : idx)}
        <div
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-65fdbade2025 svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-b4cf72cd1cd8',
            isHorizontal ? 'svadmin-u-020ba687fa12' : '',
            spanClass(Math.min(item.span ?? 1, columns)),
          )}
        >
          <dt
            class={cn(
              'svadmin-u-2859c861d7de svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-012fbd121f37 svadmin-u-65fdbade2025 svadmin-u-a968a4123359 svadmin-u-27165ed73e86 svadmin-u-cdf6e054e5e0',
              isCompact ? 'svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529' : 'svadmin-u-f0faeb26d656 svadmin-u-e7ee55ac7ffe svadmin-u-359090c2d529 svadmin-u-e2327d142859',
              isHorizontal ? 'svadmin-u-b03f3c253900' : '',
            )}
          >
            {item.label}
          </dt>
          <dd
            class={cn(
              'svadmin-u-170cee3ff4e4 svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-cd0ad9a56558 svadmin-u-36e579c0b41c svadmin-u-7e0b7cdf1a94',
              isCompact ? 'svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529' : 'svadmin-u-f0faeb26d656 svadmin-u-e7ee55ac7ffe svadmin-u-359090c2d529 svadmin-u-e2327d142859',
            )}
          >
            {#if item.href}
              <a class="svadmin-u-20aaf08a7ed1 svadmin-u-02af9e5da98e svadmin-u-f673f4a7d061" href={item.href}>{String(item.value ?? '—')}</a>
            {:else}
              {item.value != null ? String(item.value) : '—'}
            {/if}
            {#if item.description}
              <p class="svadmin-u-15e1b1f444fe svadmin-u-359090c2d529 svadmin-u-8ecebc9f80e6 svadmin-u-bfa603190748">{item.description}</p>
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  </div>
{:else}
  <dl
    class={cn(
      'svadmin-u-f3c543ad5fe9',
      columnClass,
      isCompact ? 'svadmin-u-513d5c30bf66 svadmin-u-bcf14a5a5472' : 'svadmin-u-706c16d853e6 svadmin-u-375f36f67650',
      className,
    )}
  >
    {#each items as item, idx (item.label ? `${item.label}-${idx}` : idx)}
      <div
        class={cn(
          'svadmin-u-7e0b7cdf1a94',
          isHorizontal ? 'svadmin-u-60fbb7713999 svadmin-u-b7012bb243cc svadmin-u-77a2a20e90d4' : '',
          spanClass(Math.min(item.span ?? 1, columns)),
        )}
      >
        <dt
          class={cn(
            'svadmin-u-2689f3958069 svadmin-u-bfa603190748',
            isCompact ? 'svadmin-u-359090c2d529' : 'svadmin-u-359090c2d529',
            isHorizontal ? 'svadmin-u-012fbd121f37 svadmin-u-2e7a6d18a20d' : '',
          )}
        >
          {item.label}
        </dt>
        <dd
          class={cn(
            'svadmin-u-170cee3ff4e4 svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c',
            isHorizontal ? 'svadmin-u-359090c2d529 svadmin-u-e2327d142859' : isCompact ? 'svadmin-u-15e1b1f444fe svadmin-u-359090c2d529 svadmin-u-e2327d142859' : 'svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb',
          )}
        >
          {#if item.href}
            <a class="svadmin-u-20aaf08a7ed1 svadmin-u-02af9e5da98e svadmin-u-f673f4a7d061" href={item.href}>{String(item.value ?? '—')}</a>
          {:else}
            {item.value != null ? String(item.value) : '—'}
          {/if}
          {#if item.description}
            <p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-8ecebc9f80e6 svadmin-u-bfa603190748">{item.description}</p>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
{/if}
