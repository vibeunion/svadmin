<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Send, Clock, MessageSquare, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface ActivityItem {
    id: string;
    user?: {
      name: string;
      avatar?: string;
    };
    action: string;
    target?: string;
    timestamp: string;
    comment?: string;
    status?: 'info' | 'success' | 'warning' | 'destructive';
  }

  interface Props {
    activities?: ActivityItem[];
    onaddcomment?: (comment: string) => void | Promise<void>;
    allowComment?: boolean;
    class?: string;
  }

  let {
    activities = [],
    onaddcomment,
    allowComment = true,
    class: className = '',
  }: Props = $props();

  let newComment = $state('');
  let isSending = $state(false);

  async function handleSend() {
    if (!newComment.trim()) return;
    isSending = true;
    try {
      await onaddcomment?.(newComment.trim());
      newComment = '';
    } finally {
      isSending = false;
    }
  }

  function getStatusBadge(status?: ActivityItem['status']) {
    switch (status) {
      case 'success':
        return 'bg-success/15 text-success border-success/20';
      case 'warning':
        return 'bg-warning/15 text-warning-foreground border-warning/20';
      case 'destructive':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  }
</script>

<div class={cn('space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs text-xs', className)}>
  <div class="flex items-center justify-between pb-2 border-b border-border/60">
    <h4 class="font-semibold text-foreground flex items-center gap-1.5">
      <MessageSquare class="h-4 w-4 text-primary" />
      Activity & Timeline Stream
    </h4>
    <span class="text-muted-foreground text-[11px]">{activities.length} event{activities.length === 1 ? '' : 's'}</span>
  </div>

  <!-- Timeline Stream -->
  <div class="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
    {#each activities as act (act.id)}
      <div class="relative flex items-start gap-3 group">
        <!-- Bullet dot -->
        <div class="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-card bg-primary ring-2 ring-primary/20"></div>

        <div class="flex-1 space-y-1.5">
          <div class="flex flex-wrap items-center justify-between gap-1">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-foreground">{act.user?.name ?? 'System'}</span>
              <span class="text-muted-foreground">{act.action}</span>
              {#if act.target}
                <strong class="text-foreground">{act.target}</strong>
              {/if}
              {#if act.status}
                <Badge variant="outline" class={cn('text-[10px] px-1 py-0', getStatusBadge(act.status))}>
                  {act.status}
                </Badge>
              {/if}
            </div>

            <div class="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock class="h-3 w-3" />
              <span>{act.timestamp}</span>
            </div>
          </div>

          {#if act.comment}
            <div class="rounded-lg bg-muted/40 p-2.5 text-foreground border border-border/40 font-normal">
              {act.comment}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if activities.length === 0}
      <div class="py-6 text-center text-muted-foreground">
        No recent activities
      </div>
    {/if}
  </div>

  <!-- Add Comment Box -->
  {#if allowComment && onaddcomment}
    <div class="pt-3 border-t border-border/60 space-y-2">
      <textarea
        bind:value={newComment}
        placeholder="Add an internal comment or update note..."
        class="w-full h-16 rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      ></textarea>
      <div class="flex justify-end">
        <Button size="sm" class="h-7 text-xs gap-1" disabled={isSending || !newComment.trim()} onclick={handleSend}>
          {#if isSending}
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
          {:else}
            <Send class="h-3.5 w-3.5" />
          {/if}
          Send Comment
        </Button>
      </div>
    </div>
  {/if}
</div>
