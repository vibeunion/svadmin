<script module lang="ts">
  export type BooleanTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
</script>

<script lang="ts">
  import { Badge } from '../ui/badge/index.js';
  import { cn } from '../../utils.js';

  interface Props {
    value: boolean | null | undefined;
    mode?: 'icon' | 'badge' | 'tag' | 'text';
    trueIcon?: string;
    falseIcon?: string;
    trueLabel?: string;
    falseLabel?: string;
    nullLabel?: string;
    trueTone?: BooleanTone;
    falseTone?: BooleanTone;
    class?: string;
  }

  let {
    value,
    mode = 'icon',
    trueIcon = '✓',
    falseIcon = '✗',
    trueLabel = 'Yes',
    falseLabel = 'No',
    nullLabel = '—',
    trueTone = 'success',
    falseTone = 'danger',
    class: className = '',
  }: Props = $props();

  const toneClass: Record<BooleanTone, string> = {
    success: 'svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff',
    warning: 'svadmin-u-2f960aa0c478 svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab',
    danger: 'svadmin-u-9d5d8b4711b4 svadmin-u-43928fcc832f svadmin-u-811148b13d1e',
    info: 'svadmin-u-05f954a846d6 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1',
    neutral: 'svadmin-u-18049387f0af svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748',
  };
</script>

{#if value == null}
  <span class={cn('svadmin-u-bfa603190748', className)}>{nullLabel}</span>
{:else if mode === 'badge' || mode === 'tag'}
  <Badge
    variant="outline"
    class={cn(
      'svadmin-u-2689f3958069 svadmin-u-359090c2d529',
      value ? toneClass[trueTone] : toneClass[falseTone],
      className
    )}
  >
    {value ? trueLabel : falseLabel}
  </Badge>
{:else if mode === 'text'}
  <span
    class={cn(
      'svadmin-u-2689f3958069 svadmin-u-fc7473ca09eb',
      value
        ? trueTone === 'success'
          ? 'svadmin-u-76747e5e02ff'
          : 'svadmin-u-d4108abe6359'
        : falseTone === 'danger'
          ? 'svadmin-u-811148b13d1e'
          : 'svadmin-u-bfa603190748',
      className
    )}
  >
    {value ? trueLabel : falseLabel}
  </span>
{:else}
  {#if value}
    <span
      class={cn(
        'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-72470489ff4e svadmin-u-cd0d9c512cdc svadmin-u-ac204c108886 svadmin-u-359090c2d529 svadmin-u-e83a7042bc91',
        toneClass[trueTone],
        className
      )}
    >
      {trueIcon}
    </span>
  {:else}
    <span
      class={cn(
        'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-72470489ff4e svadmin-u-cd0d9c512cdc svadmin-u-ac204c108886 svadmin-u-359090c2d529 svadmin-u-e83a7042bc91',
        toneClass[falseTone],
        className
      )}
    >
      {falseIcon}
    </span>
  {/if}
{/if}
