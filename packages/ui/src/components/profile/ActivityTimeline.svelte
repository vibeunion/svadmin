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
  const config: Record<ActivityItem['type'], { icon: Component; tone: string; action: string }> = {    posted: { icon: MessageSquare, tone: 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1', action: i18n.t('publicProfile.activityPosted') },
    commented: { icon: MessageSquare, tone: 'svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff', action: i18n.t('publicProfile.activityCommented') },
    joined: { icon: UserPlus, tone: 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748', action: i18n.t('publicProfile.activityJoined') },
    created: { icon: Plus, tone: 'svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab', action: i18n.t('publicProfile.activityCreated') },
    starred: { icon: Star, tone: 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1', action: i18n.t('publicProfile.activityCreated') },
  };
</script>

<section class="svadmin-u-3e7ce58d64fa">
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93"><SectionHeader title={i18n.t("publicProfile.activity")} />{#if showAutoRefresh}<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-eb6a3cef9686"><Button size="sm" variant={autoRefresh ? "default" : "ghost"} onclick={() => autoRefresh = true}>{i18n.t("common.on")}</Button><Button size="sm" variant={!autoRefresh ? "default" : "ghost"} onclick={() => autoRefresh = false}>{i18n.t("common.off")}</Button></div>{/if}</div>
  {#if activities.length === 0}<DataState state="empty" title={i18n.t('publicProfile.noActivity')} />{:else}<Card.Card><Card.CardContent class="svadmin-u-8a539c7fe216"><div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">{#each activities as activity (activity.id)}{@const item = config[activity.type] ?? config['posted']}<div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c svadmin-u-8e63407b5ceb">{#if activity.avatar}<Avatar src={activity.avatar} alt={activity.user} size="sm" />{:else}<span class={'svadmin-u-60fbb7713999 svadmin-u-d8f5213f0fe0 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 ' + item.tone}><item.icon class="svadmin-u-f7b5fa971871" /></span>{/if}<div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c"><p class="svadmin-u-fc7473ca09eb"><strong class="svadmin-u-d4108abe6359">{activity.user}</strong><span class="svadmin-u-bfa603190748"> {item.action} </span>{#if activity.target}<strong class="svadmin-u-d4108abe6359">{activity.target}</strong>{/if}</p>{#if activity.content}<p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{activity.content}</p>{/if}<p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{activity.timestamp}</p></div></div>{/each}</div></Card.CardContent></Card.Card>{/if}</section>
