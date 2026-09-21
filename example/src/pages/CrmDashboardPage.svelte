<script lang="ts">
  import { useList, useUpdateMany } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageShell, ContentPageHeader } from '@svadmin/ui';
  import { demoContracts } from '../resource-contracts';
  import { demoRenderers } from '../resource-rendering';
  import { readHashView } from '../utils/hashView';
  import CrmStageProgress from '../components/CrmStageProgress.svelte';
  import WorkspaceQueryState from './WorkspaceQueryState.svelte';
  import WorkspaceRecordLinks from './WorkspaceRecordLinks.svelte';

  let { resourceName = 'crm_accounts' } = $props<{ resourceName?: string }>();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  let view = $state(readHashView('default'));
  let search = $state('');
  let busy = $state(false);
  let feedback = $state('');
  const accountsQuery = useList({ resource: demoContracts.crm_accounts, pagination: { mode: 'off' } });
  const contactsQuery = useList({ resource: demoContracts.crm_contacts, pagination: { mode: 'off' } });
  const dealsQuery = useList({ resource: demoContracts.crm_deals, pagination: { mode: 'off' } });
  const activitiesQuery = useList({ resource: demoContracts.crm_activities, pagination: { mode: 'off' }, sorters: [{ field: 'dueDate', order: 'asc' }] });
  const activityUpdate = useUpdateMany({ resource: demoContracts.crm_activities });
  const accounts = $derived(demoRenderers.crm_accounts.records(accountsQuery.data?.data ?? []));
  const contacts = $derived(demoRenderers.crm_contacts.records(contactsQuery.data?.data ?? []));
  const deals = $derived(demoRenderers.crm_deals.records(dealsQuery.data?.data ?? []));
  const activities = $derived(demoRenderers.crm_activities.records(activitiesQuery.data?.data ?? []));
  const navigation = $derived([
    { resource: 'crm_accounts', title: isZh ? '客户账户' : 'Accounts', query: accountsQuery },
    { resource: 'crm_contacts', title: isZh ? '联系人' : 'Contacts', query: contactsQuery },
    { resource: 'crm_deals', title: isZh ? '商机' : 'Deals', query: dealsQuery },
    { resource: 'crm_activities', title: isZh ? '跟进活动' : 'Activities', query: activitiesQuery },
  ]);
  const current = $derived(navigation.find(item => item.resource === resourceName) ?? navigation[0]!);
  const title = $derived(view === 'reports' || view === 'dashboard' ? (isZh ? 'CRM 经营快照' : 'CRM snapshot') : view === 'notes' ? (isZh ? '跟进记录' : 'Follow-up notes') : current.title);
  const matches = (value: string) => value.toLowerCase().includes(search.trim().toLowerCase());
  const visibleAccounts = $derived(accounts.filter(item => matches(`${item.accountName} ${item.notes}`)));
  const visibleContacts = $derived(contacts.filter(item => matches(`${item.fullName} ${item.email} ${item.notes}`)));
  const visibleDeals = $derived(deals.filter(item => matches(item.dealName)).sort((a, b) => b.amount - a.amount));
  const visibleActivities = $derived(activities.filter(item => matches(`${item.subject} ${item.outcome}`) && (view !== 'tasks' || item.status !== 'completed') && (view !== 'notes' || item.outcome.trim().length > 0)));
  const visibleCount = $derived(resourceName === 'crm_accounts' ? visibleAccounts.length : resourceName === 'crm_contacts' ? visibleContacts.length : resourceName === 'crm_deals' ? visibleDeals.length : visibleActivities.length);
  const openDeals = $derived(deals.filter(item => !['won', 'lost'].includes(item.stage)));
  const stages = ['discovery', 'proposal', 'negotiation', 'won', 'lost'];
  const stageLabels: Record<string, string> = { discovery: '发现', proposal: '方案', negotiation: '谈判', won: '赢单', lost: '丢单' };
  const money = (value: number) => new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD' }).format(value);
  async function completeActivity(id: number): Promise<void> {
    if (busy) return;
    busy = true; feedback = '';
    try {
      await activityUpdate.mutation.mutateAsync({ ids: [id], variables: { status: 'completed' } });
      await activitiesQuery.refetch();
      feedback = isZh ? '跟进活动已完成。' : 'Activity completed.';
    } catch { feedback = isZh ? '未能完成，请重试。' : 'Unable to complete. Please retry.'; }
    finally { busy = false; }
  }
</script>

<svelte:window onhashchange={() => view = readHashView('default')} onpopstate={() => view = readHashView('default')} />

{#snippet actions()}
  <Button onclick={() => window.location.hash = `/${resourceName}/create`}>{isZh ? '新建' : 'Create'} {current.title}</Button>
{/snippet}

<div data-app-page="crm-dashboard" data-crm-view={view} data-resource-name={resourceName}>
  <ContentPageShell pageId="crm-dashboard" width="wide">
    <ContentPageHeader title={title} actions={actions} />
    <nav class="flex flex-wrap gap-4 border-b pb-3" aria-label="CRM">
      {#each navigation as item (item.resource)}<a class="text-sm font-medium text-primary" aria-current={resourceName === item.resource ? 'page' : undefined} href={`#/${item.resource}`}>{item.title}</a>{/each}
      <a class="text-sm text-primary" href="#/crm_activities?view=tasks">{isZh ? '待跟进' : 'Open follow-ups'}</a>
      <a class="text-sm text-primary" href="#/crm_activities?view=notes">{isZh ? '跟进记录' : 'Notes'}</a>
      <a class="text-sm text-primary" href="#/crm_deals?view=reports">{isZh ? '报表' : 'Reports'}</a>
    </nav>
    {#if view === 'reports' || view === 'dashboard' || resourceName === 'crm_deals'}
      <WorkspaceQueryState query={dealsQuery}>
        <dl class="grid grid-cols-3 gap-3 border-y py-3">
          <div class="min-w-0"><dt class="text-xs text-muted-foreground">{isZh ? '开放商机金额' : 'Open pipeline'}</dt><dd class="mt-1 break-words text-sm font-semibold">{money(openDeals.reduce((sum, item) => sum + item.amount, 0))}</dd></div>
          <div class="min-w-0"><dt class="text-xs text-muted-foreground">{isZh ? '加权预测' : 'Weighted pipeline'}</dt><dd class="mt-1 break-words text-sm font-semibold">{money(openDeals.reduce((sum, item) => sum + item.amount * item.probability / 100, 0))}</dd></div>
          <div class="min-w-0"><dt class="text-xs text-muted-foreground">{isZh ? '最高金额商机' : 'Largest opportunity'}</dt><dd class="mt-1 break-words text-sm font-medium">{[...deals].sort((a, b) => b.amount - a.amount)[0]?.dealName ?? '—'}</dd></div>
        </dl>
        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {#each stages as stage (stage)}
            {@const count = deals.filter(item => item.stage === stage).length}
            <CrmStageProgress label={isZh ? stageLabels[stage] : stage} {count} total={deals.length} />
          {/each}
        </section>
      </WorkspaceQueryState>
    {/if}
    <label class="flex flex-wrap items-center gap-3 text-sm">{isZh ? '搜索' : 'Search'}<input class="min-w-0 flex-1 rounded-md border bg-background px-3 py-2" bind:value={search} /><Button variant="ghost" onclick={() => search = ''}>{isZh ? '清除' : 'Clear'}</Button></label>
    {#if feedback}<p role="status">{feedback}</p>{/if}
    <WorkspaceQueryState query={current.query} count={visibleCount}>
      <section class="divide-y" aria-label={current.title}>
        {#if resourceName === 'crm_accounts'}
          {#each visibleAccounts as item (item.id)}
            <article class="py-4"><div class="flex flex-wrap justify-between gap-3"><h2 class="text-base font-semibold">{item.accountName}</h2><Badge variant="outline">{item.health}</Badge></div><p class="mt-2 text-sm text-muted-foreground">{item.notes}</p><p class="mt-2 text-sm">{isZh ? '下次复盘' : 'Next review'}: {item.nextReview}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>
          {/each}
        {:else if resourceName === 'crm_contacts'}
          {#each visibleContacts as item (item.id)}
            <article class="py-4"><h2 class="text-base font-semibold">{item.fullName}</h2><p class="mt-2 text-sm">{item.roleTitle} · {item.lastTouchDate}</p><a class="text-sm text-primary" href={`mailto:${item.email}`}>{item.email}</a><p class="text-sm text-muted-foreground">{item.notes}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>
          {/each}
        {:else if resourceName === 'crm_deals'}
          {#each visibleDeals as item (item.id)}
            <article class="py-4"><div class="flex flex-wrap justify-between gap-3"><h2 class="text-base font-semibold">{item.dealName}</h2><Badge variant="outline">{isZh ? stageLabels[item.stage] ?? item.stage : item.stage}</Badge></div><p class="mt-2 text-sm">{money(item.amount)} · {item.closeDate}</p><p class="text-sm text-muted-foreground">{item.nextStep}</p><WorkspaceRecordLinks resource={resourceName} id={item.id} /></article>
          {/each}
        {:else}
          {#each visibleActivities as item (item.id)}
            <article class="py-4"><div class="flex flex-wrap justify-between gap-3"><h2 class="text-base font-semibold">{item.subject}</h2><Badge variant="outline">{item.status}</Badge></div><p class="mt-2 text-sm">{item.dueDate} · {item.type}</p><p class="text-sm text-muted-foreground">{item.outcome}</p><div class="flex flex-wrap items-center justify-between gap-3"><WorkspaceRecordLinks resource={resourceName} id={item.id} />{#if item.status !== 'completed'}<Button size="sm" disabled={busy} onclick={() => void completeActivity(item.id)}>{isZh ? '完成跟进' : 'Complete follow-up'}</Button>{/if}</div></article>
          {/each}
        {/if}
      </section>
    </WorkspaceQueryState>
  </ContentPageShell>
</div>
