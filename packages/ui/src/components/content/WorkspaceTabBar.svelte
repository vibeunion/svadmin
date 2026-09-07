<script module lang="ts">
  import type { Component } from 'svelte';

  export interface WorkspaceTabItem {
    id: string;
    label: string;
    icon?: Component<{ class?: string; 'aria-hidden'?: string | boolean }>;
    badge?: string | number;
    disabled?: boolean;
    description?: string;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    items: WorkspaceTabItem[];
    activeId: string;
    onselect?: (item: WorkspaceTabItem) => void;
    variant?: 'segmented' | 'pill' | 'underline';
    ariaLabel?: string;
    class?: string;
  }

  let {
    items,
    activeId,
    onselect,
    variant = 'segmented',
    ariaLabel = 'Workspace tabs',
    class: className = '',
  }: Props = $props();
</script>

<nav
  aria-label={ariaLabel}
  class={cn(
    'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0',
    variant === 'segmented' && 'svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-b00f43c30c2b svadmin-u-eb6a3cef9686',
    variant === 'pill' && 'svadmin-u-58284b4ea568 svadmin-u-de8350a3bbad',
    variant === 'underline' && 'svadmin-u-77a2a20e90d4 svadmin-u-65fdbade2025 svadmin-u-18049387f0af',
    className,
  )}
  data-svadmin-workspace-tab-bar
  data-variant={variant}
>
  {#each items as item (item.id)}
    {@const Icon = item.icon}
    {@const isActive = item.id === activeId}
    <button
      type="button"
      disabled={item.disabled}
      class={cn(
        'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-df37b1fd9495 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a svadmin-u-49330148794a svadmin-u-b29d8adbad2e',
        variant === 'segmented' && [
          isActive
            ? 'svadmin-u-e6f9e383a762 svadmin-u-d4108abe6359 svadmin-u-438b2237b8d6 svadmin-u-e83a7042bc91'
            : 'svadmin-u-bfa603190748 svadmin-u-d01723c1dc46 svadmin-u-ea7b2e9e070e',
        ],
        variant === 'pill' && [
          isActive
            ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2 svadmin-u-e83a7042bc91'
            : 'svadmin-u-358af0b65a31 svadmin-u-bfa603190748 svadmin-u-8e551981c8d7 svadmin-u-ea7b2e9e070e',
        ],
        variant === 'underline' && [
          'svadmin-u-0c5e9137c7de svadmin-u-65ac0c49a5d5 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b',
          isActive
            ? 'svadmin-u-6cbc84dd9e1a svadmin-u-20aaf08a7ed1 svadmin-u-e83a7042bc91'
            : 'svadmin-u-521fa0c7c407 svadmin-u-bfa603190748 svadmin-u-512e82e6a68f svadmin-u-ea7b2e9e070e',
        ],
      )}
      aria-current={isActive ? 'page' : undefined}
      onclick={() => onselect?.(item)}
    >
      {#if Icon}
        <Icon class="svadmin-u-f7b5fa971871 svadmin-u-012fbd121f37" aria-hidden="true" />
      {/if}
      <span>{item.label}</span>
      {#if item.badge !== undefined && item.badge !== ''}
        <span
          class={cn(
            'svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-76067d04e222 svadmin-u-69450ef1487e svadmin-u-c2385a463da8 svadmin-u-3032cae0badb',
            isActive
              ? (variant === 'pill' ? 'svadmin-u-d9d0c50e89ff svadmin-u-30ca335ae9c2' : 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1')
              : 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748',
          )}
        >
          {item.badge}
        </span>
      {/if}
    </button>
  {/each}
</nav>
