<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { MessageSquare, Plus, Star, UserPlus } from '@lucide/svelte';
  import { Avatar } from '../ui/avatar/index.js';
  import { Button } from '../ui/button/index.js';
  import { DataState, SectionHeader } from '../content/index.js';
  import * as Card from '../ui/card/index.js';
  import type { Component } from 'svelte';

  interface ActivityItem { id: string; type: 'posted' | 'commented' | 'joined' | 'created' | 'starred'; user: string; avatar?: string; content?: string; target?: string; timestamp: string; }
  interface Props { activities?: ActivityItem[]; showAutoRefresh?: boolean; }
  let { activities = [], showAutoRefresh = true }: Props = $props();
  let autoRefresh = $state(false);
  const i18n = useTranslation();
  const config: Record<string, { icon: Component; tone: string; action: string }> = {
    posted: { icon: MessageSquare, tone: 'bg-primary/10 text-primary', action: i18n.t('publicProfile.activityPosted') },
    commented: { icon: MessageSquare, tone: 'bg-success/10 text-success', action: i18n.t('publicProfile.activityCommented') },
    joined: { icon: UserPlus, tone: 'bg-muted text-muted-foreground', action: i18n.t('publicProfile.activityJoined') },
    created: { icon: Plus, tone: 'bg-warning/10 text-warning-foreground', action: i18n.t('publicProfile.activityCreated') },
    starred: { icon: Star, tone: 'bg-primary/10 text-primary', action: i18n.t('publicProfile.activityCreated') },
  };
</script>

<section class="space-y-4">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><SectionHeader title={i18n.t("publicProfile.activity")} />{#if showAutoRefresh}<div class="flex items-center gap-1 rounded-md border border-border p-1"><Button size="sm" variant={autoRefresh ? "default" : "ghost"} onclick={() => autoRefresh = true}>{i18n.t("common.on")}</Button><Button size="sm" variant={!autoRefresh ? "default" : "ghost"} onclick={() => autoRefresh = false}>{i18n.t("common.off")}</Button></div>{/if}</div>
  {#if activities.length === 0}<DataState state="empty" title={i18n.t('publicProfile.noActivity')} />{:else}<Card.Card><Card.CardContent class="p-0"><div class="divide-y divide-border">{#each activities as activity (activity.id)}{@const item = config[activity.type] ?? config.posted}<div class="flex items-start gap-3 p-4">{#if activity.avatar}<Avatar src={activity.avatar} alt={activity.user} size="sm" />{:else}<span class={'flex size-8 shrink-0 items-center justify-center rounded-full ' + item.tone}><item.icon class="size-4" /></span>{/if}<div class="min-w-0 flex-1"><p class="text-sm"><strong class="text-foreground">{activity.user}</strong><span class="text-muted-foreground"> {item.action} </span>{#if activity.target}<strong class="text-foreground">{activity.target}</strong>{/if}</p>{#if activity.content}<p class="mt-1 text-sm text-muted-foreground">{activity.content}</p>{/if}<p class="mt-1 text-xs text-muted-foreground">{activity.timestamp}</p></div></div>{/each}</div></Card.CardContent></Card.Card>{/if}
</section>
