<script lang="ts">
  import { cn } from '../../utils.js';

  export interface StatusTabItem {
    key: string;
    label: string;
    count?: number | string;
    tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';
    disabled?: boolean;
  }

  interface Props {
    items: StatusTabItem[];
    value?: string;
    density?: 'compact' | 'comfortable';
    variant?: 'pills' | 'underline' | 'segmented';
    onchange?: (key: string) => void;
    class?: string;
  }

  let {
    items = [],
    value = $bindable(items[0]?.key ?? ''),
    density = 'compact',
    variant = 'pills',
    onchange,
    class: className = '',
  }: Props = $props();

  function selectTab(key: string, disabled?: boolean) {
    if (disabled || key === value) return;
    value = key;
    onchange?.(key);
  }

  type TabKeyboardEvent = KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement };

  function handleKeydown(event: TabKeyboardEvent) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const tabList = event.currentTarget.closest('[role="tablist"]');
    if (!tabList) return;

    const tabs = Array.from(
      tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
    );
    const currentIndex = tabs.indexOf(event.currentTarget);
    if (currentIndex === -1 || tabs.length === 0) return;

    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;

    event.preventDefault();
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  }

  const isCompact = $derived(density === 'compact');

  const toneClasses: Record<NonNullable<StatusTabItem['tone']>, { activeBadge: string; inactiveBadge: string }> = {
    default: {
      activeBadge: 'svadmin-u-6a1572b6bf5a svadmin-u-20aaf08a7ed1',
      inactiveBadge: 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748',
    },
    success: {
      activeBadge: 'svadmin-u-68750801bcf6 svadmin-u-76747e5e02ff',
      inactiveBadge: 'svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff',
    },
    warning: {
      activeBadge: 'svadmin-u-3bb45dd48a74 svadmin-u-3a4ff758c2ab',
      inactiveBadge: 'svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab',
    },
    destructive: {
      activeBadge: 'svadmin-u-f71dfc1f3d97 svadmin-u-811148b13d1e',
      inactiveBadge: 'svadmin-u-43928fcc832f svadmin-u-811148b13d1e',
    },
    info: {
      activeBadge: 'svadmin-u-ab159a179155 svadmin-u-fa68ba954fb0',
      inactiveBadge: 'svadmin-u-1c1af10f0ece svadmin-u-fa68ba954fb0',
    },
    muted: {
      activeBadge: 'svadmin-u-2ef11f1cb219 svadmin-u-d4108abe6359',
      inactiveBadge: 'svadmin-u-358af0b65a31 svadmin-u-bfa603190748',
    },
  };
</script>

<div
  role="tablist"
  aria-orientation="horizontal"
  data-svadmin-status-tabs
  data-density={density}
  data-variant={variant}
  class={cn(
    'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0',
    variant === 'segmented' && 'svadmin-u-5f22e64f2282 svadmin-u-2ef11f1cb219 svadmin-u-eb6a3cef9686',
    variant === 'underline' && 'svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-77a2a20e90d4',
    className
  )}
>
  {#each items as item (item.key)}
    {@const active = value === item.key}
    {@const tone = item.tone ?? 'default'}
    {@const badgeTone = toneClasses[tone] ?? toneClasses['default']}
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabindex={active ? 0 : -1}
      disabled={item.disabled}
      onclick={() => selectTab(item.key, item.disabled)}
      onkeydown={handleKeydown}
      class={cn(
        'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-e82ae8be04aa svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-df37b1fd9495 svadmin-u-793c80e97ffb svadmin-u-ddac70ae5d29 svadmin-u-49330148794a svadmin-u-b29d8adbad2e',
        isCompact ? 'svadmin-u-359090c2d529 svadmin-u-0b91436debbd svadmin-u-660d2effb880' : 'svadmin-u-fc7473ca09eb svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b',
        variant === 'pills' && [
          'svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f',
          active
            ? 'svadmin-u-18049387f0af svadmin-u-e6f9e383a762 svadmin-u-d4108abe6359 svadmin-u-cef5b893cf23 svadmin-u-e83a7042bc91'
            : 'svadmin-u-521fa0c7c407 svadmin-u-bfa603190748 svadmin-u-39f703dbe296 svadmin-u-ea7b2e9e070e',
        ],
        variant === 'segmented' && [
          'svadmin-u-421ac2be5045',
          active
            ? 'svadmin-u-e6f9e383a762 svadmin-u-d4108abe6359 svadmin-u-cef5b893cf23 svadmin-u-e83a7042bc91'
            : 'svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e',
        ],
        variant === 'underline' && [
          'svadmin-u-f04f99ff45cb svadmin-u-65ac0c49a5d5 svadmin-u-0c5e9137c7de svadmin-u-0e17f2bd9074 svadmin-u-f4cc511ff0c1 svadmin-u-6b7d6e21ccbd',
          active
            ? 'svadmin-u-6cbc84dd9e1a svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91'
            : 'svadmin-u-521fa0c7c407 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-03b959081b5e',
        ]
      )}
    >
      <span>{item.label}</span>
      {#if item.count !== undefined}
        <span
          class={cn(
            'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-e83a7042bc91 svadmin-u-3032cae0badb svadmin-u-c2385a463da8',
            isCompact ? 'svadmin-u-69aaf7265e58 svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-1dc571a3609f' : 'svadmin-u-f8516763aedd svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-359090c2d529',
            active ? badgeTone.activeBadge : badgeTone.inactiveBadge
          )}
        >
          {item.count}
        </span>
      {/if}
    </button>
  {/each}
</div>
