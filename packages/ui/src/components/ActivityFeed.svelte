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
</script>

<div class={cn('svadmin-activity-feed', className)}>
  <div class="svadmin-activity-feed__header">
    <h4 class="svadmin-activity-feed__title">
      <MessageSquare class="svadmin-activity-feed__icon" />
      Activity & Timeline Stream
    </h4>
    <span class="svadmin-activity-feed__count">{activities.length} event{activities.length === 1 ? '' : 's'}</span>
  </div>

  <div class="svadmin-activity-feed__timeline">
    {#each activities as act (act.id)}
      <div class="svadmin-activity-feed__item">
        <div class="svadmin-activity-feed__dot"></div>

        <div class="svadmin-activity-feed__body">
          <div class="svadmin-activity-feed__meta">
            <div class="svadmin-activity-feed__summary">
              <span class="svadmin-activity-feed__user">{act.user?.name ?? 'System'}</span>
              <span class="svadmin-activity-feed__action">{act.action}</span>
              {#if act.target}
                <strong class="svadmin-activity-feed__target">{act.target}</strong>
              {/if}
              {#if act.status}
                <Badge variant="outline" data-status={act.status}>
                  {act.status}
                </Badge>
              {/if}
            </div>

            <div class="svadmin-activity-feed__timestamp">
              <Clock class="svadmin-activity-feed__timestamp-icon" />
              <span>{act.timestamp}</span>
            </div>
          </div>

          {#if act.comment}
            <div class="svadmin-activity-feed__comment">
              {act.comment}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if activities.length === 0}
      <div class="svadmin-activity-feed__empty">
        No recent activities
      </div>
    {/if}
  </div>

  <!-- Add Comment Box -->
  {#if allowComment && onaddcomment}
    <div class="svadmin-activity-feed__composer">
      <textarea
        bind:value={newComment}
        placeholder="Add an internal comment or update note..."
        class="svadmin-activity-feed__textarea"
      ></textarea>
      <div class="svadmin-activity-feed__send">
        <Button size="sm" class="svadmin-activity-feed__send-button" disabled={isSending || !newComment.trim()} onclick={handleSend}>
          {#if isSending}
            <Loader2 class="svadmin-activity-feed__send-icon svadmin-activity-feed__send-icon--loading" />
          {:else}
            <Send class="svadmin-activity-feed__send-icon" />
          {/if}
          Send Comment
        </Button>
      </div>
    </div>
  {/if}
</div>
