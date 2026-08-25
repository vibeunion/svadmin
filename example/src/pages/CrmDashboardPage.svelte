<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, ContentPageHeader, ContentPageShell, MetricBlock, SectionHeader } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import { BarChart3, Building2, ClipboardList, FileText, Star, TrendingUp, Users } from '@lucide/svelte';
  import { readHashView } from '../utils/hashView';

  const i18n = useTranslation();

  interface Account { id: number; accountName: string; health: string; ownerId: number; nextStep: string; }
  interface Contact { id: number; fullName: string; roleTitle: string; influence: string; status: string; lastTouchDate: string; notes: string; }
  interface Deal { id: number; dealName: string; stage: string; amount: number; probability: number; closeDate: string; }
  interface Activity { id: number; subject: string; type: string; dueDate: string; status: string; }

  let { resourceName = 'crm_accounts' } = $props<{ resourceName?: string }>();
  let activeView = $state(readHashView('default'));

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');
  const accountsQuery = useList({ resource: 'crm_accounts', pagination: { mode: 'off' } });
  const contactsQuery = useList({ resource: 'crm_contacts', pagination: { mode: 'off' }, sorters: [{ field: 'lastTouchDate', order: 'desc' }] });
  const dealsQuery = useList({ resource: 'crm_deals', pagination: { mode: 'off' } });
  const activitiesQuery = useList({ resource: 'crm_activities', pagination: { mode: 'off' } });
  const accounts = $derived((accountsQuery.data?.data ?? []) as unknown as Account[]);
  const contacts = $derived((contactsQuery.data?.data ?? []) as unknown as Contact[]);
  const deals = $derived((dealsQuery.data?.data ?? []) as unknown as Deal[]);
  const activities = $derived((activitiesQuery.data?.data ?? []) as unknown as Activity[]);
  const pipeline = $derived(deals.reduce((sum, deal) => sum + deal.amount, 0));
  const weighted = $derived(deals.reduce((sum, deal) => sum + deal.amount * deal.probability / 100, 0));
  const activeContacts = $derived(contacts.filter((contact) => contact.status === 'active').length);
  const plannedActivities = $derived(activities.filter((activity) => activity.status !== 'completed').length);
  const stages = $derived(['discovery', 'proposal', 'negotiation', 'won']);
  const normalizedView = $derived(['dashboard', 'companies', 'tasks', 'notes', 'reports'].includes(activeView) ? activeView : 'default');
  const crmNav = $derived([
    { key: 'tasks', label: isZh ? '任务' : 'Tasks', href: '#/crm_activities?view=tasks', value: plannedActivities, Icon: ClipboardList },
    { key: 'notes', label: isZh ? '笔记' : 'Notes', href: '#/crm_activities?view=notes', value: contacts.length, Icon: FileText },
    { key: 'contacts', label: isZh ? '联系人' : 'Contacts', href: '#/crm_contacts', value: contacts.length, Icon: Users },
    { key: 'companies', label: isZh ? '公司' : 'Companies', href: '#/crm_accounts?view=companies', value: accounts.length, Icon: Building2 },
    { key: 'favorites', label: isZh ? '收藏' : 'Favorites', href: '#/crm_accounts', value: 3, Icon: Star },
    { key: 'reports', label: isZh ? '报表' : 'Reports', href: '#/crm_deals?view=reports', value: 4, Icon: BarChart3 },
  ]);
  const recentNotes = $derived([
    { title: isZh ? '最近笔记' : 'Recent note', source: accounts[0]?.accountName ?? 'Helio Manufacturing', meta: isZh ? '方案复盘' : 'proposal review' },
    { title: isZh ? '新增线索' : 'Lead added', source: contacts[0]?.fullName ?? 'Nina Wallace', meta: isZh ? '需要回访' : 'needs follow-up' },
    { title: isZh ? '公司动态' : 'Company update', source: accounts[1]?.accountName ?? 'Summit Field Services', meta: isZh ? '采购窗口' : 'buying window' },
  ]);
  const viewCopy = $derived.by(() => {
    const copies = {
      default: {
        badge: isZh ? '客户经营' : 'CRM',
        title: isZh ? '收入管线仪表盘' : 'Revenue Pipeline Dashboard',
        description: isZh ? '聚合客户账户、商机、任务和关系健康度。' : 'Unify accounts, opportunities, tasks, and relationship health.',
        focusTitle: isZh ? '客户经营焦点' : 'CRM Focus',
      },
      dashboard: {
        badge: isZh ? 'CRM 仪表盘' : 'CRM Dashboard',
        title: isZh ? '客户经营总览' : 'Customer Operations Overview',
        description: isZh ? '从账户、联系人、商机和活动四个维度查看经营状态。' : 'Review account, contact, deal, and activity health in one overview.',
        focusTitle: isZh ? '仪表盘摘要' : 'Dashboard Summary',
      },
      companies: {
        badge: isZh ? '公司' : 'Companies',
        title: isZh ? '公司账户视图' : 'Company Account View',
        description: isZh ? '集中查看重点公司、健康度、负责人和下一步动作。' : 'Focus on priority companies, health, owners, and next steps.',
        focusTitle: isZh ? '公司跟进' : 'Company Follow-up',
      },
      tasks: {
        badge: isZh ? '任务' : 'Tasks',
        title: isZh ? '客户任务队列' : 'Customer Task Queue',
        description: isZh ? '按状态、日期和跟进类型管理客户动作。' : 'Manage customer actions by status, due date, and follow-up type.',
        focusTitle: isZh ? '任务阻塞点' : 'Task Blockers',
      },
      notes: {
        badge: isZh ? '笔记' : 'Notes',
        title: isZh ? '客户笔记复盘' : 'Customer Notes Review',
        description: isZh ? '把最近笔记、线索新增和公司动态汇总成复盘区。' : 'Turn recent notes, new leads, and company updates into a review rail.',
        focusTitle: isZh ? '最近笔记' : 'Recent Notes',
      },
      reports: {
        badge: isZh ? '报表' : 'Reports',
        title: isZh ? 'CRM 报表快照' : 'CRM Reports Snapshot',
        description: isZh ? '按管线、公司和活动维度展示经营结果。' : 'Show CRM results by pipeline, company, and activity dimensions.',
        focusTitle: isZh ? '报表维度' : 'Report Dimensions',
      },
    } satisfies Record<string, { badge: string; title: string; description: string; focusTitle: string }>;
    return copies[normalizedView as keyof typeof copies];
  });

  function syncView(): void {
    activeView = readHashView('default');
  }

  function money(value: number): string { return `$${Math.round(value / 1000)}K`; }
  function stageLabel(stage: string): string {
    if (!isZh) return stage;
    if (stage === 'discovery') return '发现';
    if (stage === 'proposal') return '方案';
    if (stage === 'negotiation') return '谈判';
    if (stage === 'won') return '已赢单';
    return stage;
  }

  function healthLabel(health: string): string {
    if (!isZh) return health.replace('_', ' ');
    if (health === 'healthy') return '健康';
    if (health === 'watch') return '观察';
    if (health === 'at_risk') return '风险';
    return health;
  }

  function influenceLabel(influence: string): string {
    if (!isZh) return influence.replace('_', ' ');
    if (influence === 'decision_maker') return '决策人';
    if (influence === 'evaluator') return '评估人';
    if (influence === 'operator') return '使用方';
    return influence;
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

<div data-app-page="crm-dashboard" data-crm-view={normalizedView} data-resource-name={resourceName}>
<ContentPageShell pageId="crm-dashboard" width="wide">
  <ContentPageHeader eyebrow={viewCopy.badge} title={viewCopy.title} description={viewCopy.description} />
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <MetricBlock label={isZh ? '客户账户' : 'Accounts'} value={accounts.length} detail={isZh ? '统一关系归属' : 'Owned relationships'} />
    <MetricBlock label={isZh ? '活跃联系人' : 'Active contacts'} value={activeContacts} detail={isZh ? '近期可跟进' : 'Ready for follow-up'} />
    <MetricBlock label={isZh ? '管线金额' : 'Pipeline'} value={money(pipeline)} detail={isZh ? '全部商机' : 'All opportunities'} />
    <MetricBlock label={isZh ? '加权预测' : 'Weighted forecast'} value={money(weighted)} detail={isZh ? '按成交概率' : 'Probability adjusted'} trend={isZh ? '可信状态' : 'Trusted state'} />
  </section>
  <section class="grid gap-4 xl:grid-cols-[1fr_0.38fr]">
    <section class="space-y-3">
      <SectionHeader title={viewCopy.focusTitle} description={viewCopy.description} />
        <div class="grid gap-3 md:grid-cols-4">
          {#each stages as stage (stage)}
            <div class="rounded-lg border bg-card p-4 shadow-sm">
              <div class="flex items-center justify-between"><p class="text-sm font-semibold">{stageLabel(stage)}</p><Badge variant="outline">{deals.filter((deal) => deal.stage === stage).length}</Badge></div>
              <div class="mt-4 h-2 rounded-full bg-muted"><div class="h-2 rounded-full bg-primary" style:width={`${Math.max(12, deals.filter((deal) => deal.stage === stage).length * 28)}%`}></div></div>
            </div>
          {/each}
        </div>
    </section>

    <div class="grid gap-4 content-start">
      <MetricBlock label={isZh ? '高价值商机' : 'Top opportunity'} value={deals[0]?.dealName ?? '-'} icon={undefined} />
      <MetricBlock label={isZh ? '待跟进活动' : 'Follow-ups'} value={plannedActivities} detail={isZh ? '需要下一步' : 'Need a next step'} />
      <Card.Root>
        <Card.Header class="pb-3"><Card.Title class="text-base">{isZh ? '快捷导航' : 'Quick Navigation'}</Card.Title></Card.Header>
        <Card.Content class="grid gap-2">
          {#each crmNav as item (item.key)}
            <a href={item.href} class={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${normalizedView === item.key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40'}`}>
              <span class="flex items-center gap-2"><item.Icon class="h-4 w-4 text-muted-foreground" />{item.label}</span>
              <Badge variant="outline">{item.value}</Badge>
            </a>
          {/each}
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <Card.Root class="border-primary/20">
    <Card.Header>
      <Card.Title class="text-base">{viewCopy.focusTitle}</Card.Title>
      <Card.Description>{viewCopy.description}</Card.Description>
    </Card.Header>
    <Card.Content class="grid gap-3 md:grid-cols-3">
      {#if normalizedView === 'tasks'}
        {#each activities as activity (activity.id)}
          <div class="rounded-lg border bg-card p-4">
            <p class="font-semibold">{activity.subject}</p>
            <p class="mt-1 text-xs text-muted-foreground">{activity.type} · {activity.dueDate}</p>
            <Badge variant="outline" class="mt-3">{activity.status.replace('_', ' ')}</Badge>
          </div>
        {/each}
      {:else if normalizedView === 'notes'}
        {#each recentNotes as note (note.title)}
          <div class="rounded-lg border bg-card p-4">
            <p class="font-semibold">{note.title}</p>
            <p class="mt-1 text-xs text-muted-foreground">{note.source}</p>
            <Badge variant="outline" class="mt-3">{note.meta}</Badge>
          </div>
        {/each}
      {:else if normalizedView === 'reports'}
        <div class="rounded-lg border bg-card p-4"><p class="text-xs text-muted-foreground">{isZh ? '管线报表' : 'Pipeline report'}</p><p class="mt-2 text-2xl font-semibold">{money(weighted)}</p></div>
        <div class="rounded-lg border bg-card p-4"><p class="text-xs text-muted-foreground">{isZh ? '公司报表' : 'Company report'}</p><p class="mt-2 text-2xl font-semibold">{accounts.length}</p></div>
        <div class="rounded-lg border bg-card p-4"><p class="text-xs text-muted-foreground">{isZh ? '活动报表' : 'Activity report'}</p><p class="mt-2 text-2xl font-semibold">{activities.length}</p></div>
      {:else}
        {#each accounts.slice(0, 3) as account (account.id)}
          <div class="rounded-lg border bg-card p-4">
            <p class="font-semibold">{account.accountName}</p>
            <p class="mt-1 text-xs text-muted-foreground">{account.nextStep}</p>
            <Badge variant="outline" class="mt-3">{healthLabel(account.health)}</Badge>
          </div>
        {/each}
      {/if}
    </Card.Content>
  </Card.Root>

  <section class="grid gap-4 xl:grid-cols-3">
    <Card.Root><Card.Header><Card.Title class="text-base">{isZh ? '重点客户' : 'Priority Accounts'}</Card.Title></Card.Header><Card.Content class="space-y-3">{#each accounts.slice(0, 4) as account (account.id)}<div class="rounded-lg border p-3"><div class="flex items-center justify-between"><p class="font-semibold">{account.accountName}</p><Badge variant="outline">{healthLabel(account.health)}</Badge></div><p class="mt-1 text-xs text-muted-foreground">{account.nextStep}</p></div>{/each}</Card.Content></Card.Root>
    <Card.Root><Card.Header><Card.Title class="flex items-center gap-2 text-base"><TrendingUp class="h-4 w-4 text-primary" />{isZh ? '商机列表' : 'Deals'}</Card.Title></Card.Header><Card.Content class="space-y-3">{#each deals.slice(0, 4) as deal (deal.id)}<div class="rounded-lg border p-3"><div class="flex items-center justify-between"><p class="font-semibold">{deal.dealName}</p><Badge>{money(deal.amount)}</Badge></div><p class="mt-1 text-xs text-muted-foreground">{stageLabel(deal.stage)} · {deal.probability}% · {deal.closeDate}</p></div>{/each}</Card.Content></Card.Root>
    <Card.Root><Card.Header><Card.Title class="flex items-center gap-2 text-base"><Users class="h-4 w-4 text-primary" />{isZh ? '联系人雷达' : 'Contact Radar'}</Card.Title></Card.Header><Card.Content class="space-y-3">{#each contacts.slice(0, 4) as contact (contact.id)}<div class="rounded-lg border p-3"><div class="flex items-center justify-between gap-3"><div><p class="font-semibold">{contact.fullName}</p><p class="mt-1 text-xs text-muted-foreground">{contact.roleTitle}</p></div><Badge variant="outline">{influenceLabel(contact.influence)}</Badge></div><p class="mt-2 text-xs text-primary">{isZh ? '最近触达' : 'Last touch'} · {contact.lastTouchDate}</p></div>{/each}</Card.Content></Card.Root>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
    <Card.Root>
      <Card.Header><Card.Title class="flex items-center gap-2 text-base"><ClipboardList class="h-4 w-4 text-primary" />{isZh ? '任务概览' : 'Tasks Overview'}</Card.Title><Card.Description>{isZh ? '按状态跟进客户动作，避免商机停滞。' : 'Track customer actions by status to keep deals moving.'}</Card.Description></Card.Header>
      <Card.Content class="space-y-3">
        {#each activities as activity (activity.id)}
          <div class="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p class="font-semibold">{activity.subject}</p>
              <p class="mt-1 text-xs text-muted-foreground">{activity.type} · {activity.dueDate}</p>
            </div>
            <Badge variant="outline">{activity.status.replace('_', ' ')}</Badge>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header><Card.Title class="text-base">{isZh ? '线索分析' : 'Lead Analytics'}</Card.Title><Card.Description>{isZh ? '用赢率和阶段分布判断下一步动作。' : 'Use probability and stage mix to decide next actions.'}</Card.Description></Card.Header>
      <Card.Content class="space-y-4">
        {#each deals as deal (deal.id)}
          <div>
            <div class="flex items-center justify-between gap-3 text-sm"><span class="font-medium">{deal.dealName}</span><span class="text-muted-foreground">{deal.probability}%</span></div>
            <div class="mt-2 h-2 rounded-full bg-muted"><div class="h-2 rounded-full bg-primary" style:width={`${deal.probability}%`}></div></div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">{isZh ? '最近笔记' : 'Recent Notes'}</Card.Title>
        <Card.Description>{isZh ? '把客户动态、线索新增和公司更新放在同一个复盘区。' : 'Review customer notes, new leads, and company updates in one rail.'}</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3">
        {#each recentNotes as note (note.title)}
          <div class="rounded-lg border p-3">
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold">{note.title}</p>
              <Badge variant="outline">{note.meta}</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{note.source}</p>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">{isZh ? '报表快照' : 'Reports Snapshot'}</Card.Title>
        <Card.Description>{isZh ? '补齐客户经营参考页中的 Reports 入口，以管线、公司和活动维度呈现。' : 'Surface the reports entry with pipeline, company, and activity dimensions.'}</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-3 md:grid-cols-3">
        <div class="rounded-lg border bg-muted/20 p-4"><p class="text-xs text-muted-foreground">{isZh ? '管线报表' : 'Pipeline report'}</p><p class="mt-2 text-2xl font-semibold">{money(weighted)}</p></div>
        <div class="rounded-lg border bg-muted/20 p-4"><p class="text-xs text-muted-foreground">{isZh ? '公司报表' : 'Company report'}</p><p class="mt-2 text-2xl font-semibold">{accounts.length}</p></div>
        <div class="rounded-lg border bg-muted/20 p-4"><p class="text-xs text-muted-foreground">{isZh ? '活动报表' : 'Activity report'}</p><p class="mt-2 text-2xl font-semibold">{activities.length}</p></div>
      </Card.Content>
    </Card.Root>
  </section>
</ContentPageShell>
</div>
