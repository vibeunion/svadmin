<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Avatar } from '../ui/avatar/index.js';
  import { MessageSquare, Plus, UserPlus, Star } from '@lucide/svelte';
  import type { Component } from 'svelte';

  const i18n = useTranslation();

  interface ActivityItem {
    id: string;
    type: 'posted' | 'commented' | 'joined' | 'created' | 'starred';
    user: string;
    avatar?: string;
    content?: string;
    target?: string;
    timestamp: string;
  }

  interface Props {
    activities?: ActivityItem[];
    showAutoRefresh?: boolean;
  }

  let { activities = [], showAutoRefresh = true }: Props = $props();

  let autoRefresh = $state(false);

  const typeConfig: Record<string, { icon: Component; color: string; action: string }> = {
    'posted': { icon: MessageSquare, color: 'bg-blue-500/10 text-blue-500', action: i18n.t('publicProfile.activityPosted') },
    'commented': { icon: MessageSquare, color: 'bg-green-500/10 text-green-500', action: i18n.t('publicProfile.activityCommented') },
    'joined': { icon: UserPlus, color: 'bg-purple-500/10 text-purple-500', action: i18n.t('publicProfile.activityJoined') },
    'created': { icon: Plus, color: 'bg-amber-500/10 text-amber-500', action: i18n.t('publicProfile.activityCreated') },
    'starred': { icon: Star, color: 'bg-yellow-500/10 text-yellow-500', action: i18n.t('publicProfile.activityCreated') },
  };
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between gap-3">
    <h3 class="text-lg font-semibold text-foreground">{i18n.t('publicProfile.activity')}</h3>
    {#if showAutoRefresh}
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{i18n.t('publicProfile.autoRefresh')}:</span>
        <div class="flex rounded-md border border-border/60 p-0.5">
          <button
            type="button"
            class="rounded px-2 py-0.5 text-xs font-medium transition-colors {autoRefresh ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => autoRefresh = true}
          >{i18n.t('common.on')}</button>
          <button
            type="button"
            class="rounded px-2 py-0.5 text-xs font-medium transition-colors {autoRefresh ? 'text-muted-foreground hover:text-foreground' : 'bg-primary text-primary-foreground'}"
            onclick={() => autoRefresh = false}
          >{i18n.t('common.off')}</button>
        </div>
      </div>
    {/if}
  </div>

  {#if activities.length === 0}
    <div class="rounded-xl border border-dashed border-border/60 p-8 text-center">
      <p class="text-sm text-muted-foreground">{i18n.t('publicProfile.noActivity')}</p>
    </div>
  {:else}
    <Card.Card class="border-border/60">
      <Card.CardContent class="p-0">
        <div class="divide-y">
          {#each activities as activity (activity.id)}
            {@const config = typeConfig[activity.type] ?? typeConfig['posted']}
            <div class="flex items-start gap-3 p-4">
              <div class="shrink-0 mt-0.5">
                {#if activity.avatar}
                  <Avatar class="h-8 w-8">
                    <img src={activity.avatar} alt={activity.user} />
                  </Avatar>
                {:else}
                  <div class="flex h-8 w-8 items-center justify-center rounded-full {config.color}">
                    <config.icon class="h-4 w-4" />
                  </div>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm">
                  <strong class="text-foreground">{activity.user}</strong>
                  <span class="text-muted-foreground"> {config.action} </span>
                  {#if activity.target}
                    <strong class="text-foreground">{activity.target}</strong>
                  {/if}
                </p>
                {#if activity.content}
                  <p class="mt-1 text-sm text-muted-foreground line-clamp-2">{activity.content}</p>
                {/if}
                <p class="mt-1 text-xs text-muted-foreground/60">{activity.timestamp}</p>
              </div>
            </div>
          {/each}
        </div>
      </Card.CardContent>
    </Card.Card>
  {/if}
</div>
