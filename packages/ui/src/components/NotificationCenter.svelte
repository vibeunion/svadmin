<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Bell, CheckCheck } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import * as Popover from './ui/popover/index.js';
  import { cn } from '../utils.js';

  export interface NotificationItem {
    id: string;
    title: string;
    description?: string;
    time?: string | Date;
    read?: boolean;
    href?: string;
    category?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  }

  interface Props {
    items?: NotificationItem[];
    title?: string;
    emptyText?: string;
    markAllText?: string;
    unreadCount?: number;
    loading?: boolean;
    open?: boolean;
    children?: Snippet;
    onread?: (item: NotificationItem) => void | Promise<void>;
    onreadall?: () => void | Promise<void>;
    onopen?: (item: NotificationItem) => void | Promise<void>;
    class?: string;
  }

  let {
    items = [],
    title = 'Notifications',
    emptyText = 'No new notifications',
    markAllText = 'Mark all as read',
    unreadCount,
    loading = false,
    open = $bindable(false),
    children,
    onread,
    onreadall,
    onopen,
    class: className = '',
  }: Props = $props();

  const resolvedUnread = $derived(unreadCount ?? items.filter((item) => !item.read).length);

  function formatTime(value: string | Date | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  async function read(item: NotificationItem): Promise<void> {
    if (!item.read) await onread?.(item);
  }

  async function activate(item: NotificationItem): Promise<void> {
    await read(item);
    await onopen?.(item);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <span class="svadmin-notification-center__trigger-wrap">
        <Button {...props} variant="ghost" size="icon-sm" aria-label={`${title}${resolvedUnread ? `, ${resolvedUnread} unread` : ''}`} class={className}>
          <Bell size={16} aria-hidden="true" />
          {#if resolvedUnread > 0}
            <span class="svadmin-notification-center__count" aria-hidden="true">{resolvedUnread > 99 ? '99+' : resolvedUnread}</span>
          {/if}
        </Button>
      </span>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="end" sideOffset={8} class="svadmin-notification-center">
    <header class="svadmin-notification-center__header">
      <h2>{title}</h2>
      {#if resolvedUnread > 0 && onreadall}
        <Button variant="ghost" size="sm" onclick={() => onreadall()}>
          <CheckCheck size={14} aria-hidden="true" />
          {markAllText}
        </Button>
      {/if}
    </header>
    <div class="svadmin-notification-center__body" aria-busy={loading}>
      {#if loading}
        <p class="svadmin-notification-center__state">Loading…</p>
      {:else if items.length === 0}
        <p class="svadmin-notification-center__state">{emptyText}</p>
      {:else}
        <ul class="svadmin-notification-center__list">
          {#each items as item (item.id)}
            <li>
              <button
                type="button"
                class={cn('svadmin-notification-center__item', !item.read && 'is-unread')}
                data-tone={item.tone ?? 'neutral'}
                onclick={() => activate(item)}
              >
                <span class="svadmin-notification-center__dot" aria-hidden="true"></span>
                <span class="svadmin-notification-center__content">
                  <span class="svadmin-notification-center__item-title">{item.title}</span>
                  {#if item.description}<span class="svadmin-notification-center__description">{item.description}</span>{/if}
                  <span class="svadmin-notification-center__meta">
                    {#if item.category}<span>{item.category}</span>{/if}
                    {#if item.time}<time datetime={item.time instanceof Date ? item.time.toISOString() : item.time}>{formatTime(item.time)}</time>{/if}
                  </span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if children}<div class="svadmin-notification-center__footer">{@render children()}</div>{/if}
    </div>
  </Popover.Content>
</Popover.Root>

<style>
  .svadmin-notification-center__trigger-wrap { position: relative; display: inline-flex; }
  .svadmin-notification-center__count {
    position: absolute;
    inset-block-start: -0.25rem;
    inset-inline-end: -0.25rem;
    min-width: 1rem;
    height: 1rem;
    padding-inline: 0.2rem;
    border-radius: 999px;
    background: var(--destructive);
    color: var(--destructive-foreground);
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1rem;
    text-align: center;
  }
  .svadmin-notification-center {
    width: min(24rem, calc(100vw - 1rem));
    padding: 0;
    overflow: hidden;
  }
  .svadmin-notification-center__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--svadmin-space-3);
    padding: var(--svadmin-space-3) var(--svadmin-space-4);
    border-block-end: 1px solid var(--border);
  }
  .svadmin-notification-center__header h2 {
    margin: 0;
    font-size: var(--svadmin-text-body);
    font-weight: 600;
    color: var(--foreground);
  }
  .svadmin-notification-center__body { max-height: min(28rem, 70vh); overflow: auto; }
  .svadmin-notification-center__state {
    margin: 0;
    padding: var(--svadmin-space-5);
    text-align: center;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label);
  }
  .svadmin-notification-center__list { margin: 0; padding: 0; list-style: none; }
  .svadmin-notification-center__item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--svadmin-space-3);
    width: 100%;
    padding: var(--svadmin-space-3) var(--svadmin-space-4);
    border: 0;
    border-block-end: 1px solid var(--border);
    background: transparent;
    color: var(--foreground);
    text-align: start;
    cursor: pointer;
  }
  .svadmin-notification-center__item:hover,
  .svadmin-notification-center__item:focus-visible {
    background: var(--accent);
    outline: none;
  }
  .svadmin-notification-center__dot {
    width: 0.5rem;
    height: 0.5rem;
    margin-block-start: 0.35rem;
    border-radius: 999px;
    background: transparent;
  }
  .svadmin-notification-center__item.is-unread .svadmin-notification-center__dot { background: var(--primary); }
  .svadmin-notification-center__item[data-tone='success'].is-unread .svadmin-notification-center__dot { background: var(--success); }
  .svadmin-notification-center__item[data-tone='warning'].is-unread .svadmin-notification-center__dot { background: var(--warning); }
  .svadmin-notification-center__item[data-tone='danger'].is-unread .svadmin-notification-center__dot { background: var(--destructive); }
  .svadmin-notification-center__content { display: grid; gap: 0.15rem; min-width: 0; }
  .svadmin-notification-center__item-title { font-size: var(--svadmin-text-label); font-weight: 600; }
  .svadmin-notification-center__description {
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
    line-height: var(--svadmin-leading-body);
  }
  .svadmin-notification-center__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--svadmin-space-2);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
  }
  .svadmin-notification-center__footer { padding: var(--svadmin-space-3); border-block-start: 1px solid var(--border); }
</style>