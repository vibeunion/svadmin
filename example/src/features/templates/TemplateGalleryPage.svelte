<script lang="ts">
  import { AppearanceSettings, Badge, Button, Grid, Input, ListPagination, Menu, NotificationsSettings, ProfilePage, SecuritySettings, SegmentedControl, Statistic, Steps, TemplatePageShell, Textarea, Timeline, TwoFactorStepper } from '@svadmin/ui';
  import {
    AdvancedDetailTemplate,
    AdvancedFormTemplate,
    AnalysisTemplate,
    BasicDetailTemplate,
    CardListTemplate,
    ExceptionTemplate,
    GroupFormTemplate,
    MonitorTemplate,
    MultiDimensionAnalysisTemplate,
    ProfileTemplate,
    ResultTemplate,
    UserInfoTemplate,
    UserSettingsTemplate,
    SearchTableTemplate,
    StepFormTemplate,
    WorkplaceTemplate,
  } from '@svadmin/ui';
  import { untrack } from 'svelte';
  import type { FormStep } from '@svadmin/ui/components/StepForm.svelte';

  const navItems = [
    { id: 'workplace', label: 'Workplace' },
    { id: 'monitor', label: 'Monitor' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'analysis-multi', label: 'Multi-dimension' },
    { id: 'search-table', label: 'Search table' },
    { id: 'card-list', label: 'Card list' },
    { id: 'group-form', label: 'Group form' },
    { id: 'step-form', label: 'Step form' },
    { id: 'advanced-form', label: 'Advanced form' },
    { id: 'basic-detail', label: 'Basic detail' },
    { id: 'advanced-detail', label: 'Advanced detail' },
    { id: 'profile', label: 'Profile' },
    { id: 'user-info', label: 'User info' },
    { id: 'user-settings', label: 'User settings' },
    { id: 'result', label: 'Result' },
    { id: 'result-error', label: 'Result error' },
    { id: 'exception', label: 'Exception 403' },
    { id: 'exception-404', label: 'Exception 404' },
    { id: 'exception-500', label: 'Exception 500' },
  ];
  let { route = '/templates', standalone = false }: { route?: string; standalone?: boolean } = $props();
  const routeTemplate = untrack(() => route.split('/').filter(Boolean).pop() ?? (typeof window === 'undefined' ? '' : window.location.hash.split('?')[0]?.split('/').filter(Boolean).pop()) ?? '');
  let active = $state<string>(untrack(() => navItems.some((item) => item.id === routeTemplate) ? routeTemplate : 'workplace'));
  let dimension = $state<'region' | 'product' | 'channel'>('region');
  const dimensionOptions = [
    { value: 'region' as const, label: 'Region' },
    { value: 'product' as const, label: 'Product' },
    { value: 'channel' as const, label: 'Channel' },
  ];
  let cardScope = $state<'all' | 'quality' | 'service'>('all');
  const cardScopeOptions = [
    { value: 'all' as const, label: 'All cards' },
    { value: 'quality' as const, label: 'Quality' },
    { value: 'service' as const, label: 'Service' },
  ];
  const approvalSteps = [
    { title: 'Commit', description: 'Submitted by Avery' },
    { title: 'Approval', description: 'Pending operations review' },
    { title: 'Finish', description: 'Publish after approval' },
  ];

  function selectTemplate(id: string): void {
    active = id;
    if (typeof window !== 'undefined') window.location.hash = `#/templates/${id}`;
  }

  const activities = [
    { id: 'a1', title: 'Quarterly plan approved', time: '09:20', tone: 'success' as const },
    { id: 'a2', title: 'Review requested for invoice batch', time: '10:05', tone: 'warning' as const },
    { id: 'a3', title: 'New member joined the workspace', time: '11:30', tone: 'info' as const },
  ];
  const records = [
    { id: 'r1', name: 'Northwind renewal', owner: 'Avery Chen', status: 'In review', amount: '$12,400' },
    { id: 'r2', name: 'Harbor onboarding', owner: 'Mina Park', status: 'Approved', amount: '$8,900' },
    { id: 'r3', name: 'Atlas expansion', owner: 'Noah Silva', status: 'Draft', amount: '$21,300' },
  ];
  const cardItems = [
    { id: 'c1', category: 'quality' as const, title: 'Operations handbook', description: 'Ownership, escalation paths and service levels.', badge: 'Updated' },
    { id: 'c2', category: 'service' as const, title: 'Customer onboarding', description: 'Checklist, owners and first-week milestones.', badge: 'Template' },
    { id: 'c3', category: 'quality' as const, title: 'Incident response', description: 'Detection, triage and post-incident review.', badge: 'Critical' },
  ];
  const visibleCards = $derived(cardScope === 'all' ? cardItems : cardItems.filter((card) => card.category === cardScope));
  const steps: FormStep[] = [
    { title: 'Basics', description: 'Name and owner' },
    { title: 'Scope', description: 'Teams and permissions' },
    { title: 'Review', description: 'Confirm and publish' },
  ];
  const timeline = [
    { id: 't1', title: 'Request created', time: 'Mon 09:12', tone: 'success' as const },
    { id: 't2', title: 'Owner assigned', time: 'Mon 09:40', tone: 'info' as const },
    { id: 't3', title: 'Awaiting approval', time: 'Tue 14:02', tone: 'warning' as const, active: true },
  ];
  const details = [
    ['Reference', 'OPS-2026-0184'],
    ['Owner', 'Operations team'],
    ['Priority', 'High'],
    ['Due date', '2026-11-04'],
  ];
  const studioDetails = [
    ['Region', 'us-east-1'],
    ['Channel', 'Web and mobile'],
    ['Owner', 'Platform team'],
    ['On-call', 'Mina Park'],
  ];
  const comparisonRows = [
    ['Priority', 'High', 'Medium'],
    ['Due date', '2026-11-04', '2026-10-28'],
    ['Approvers', 'Two reviewers', 'One reviewer'],
  ];

  function finishStep(): void {
    active = 'result';
  }
</script>

<div class="svadmin-template-gallery" class:is-standalone={standalone}>
  {#if !standalone}
    <aside class="svadmin-template-gallery__nav" aria-label="Template navigation">
      <p class="svadmin-template-gallery__eyebrow">Page templates</p>
      <Menu items={navItems} bind:selected={active} onselect={(item) => selectTemplate(item.id)} />
    </aside>
  {/if}

  <main class="svadmin-template-gallery__main">
    {#if standalone}
      <div class="svadmin-template-gallery__standalone-nav" role="navigation" aria-label="Template switcher">
        <a class="svadmin-template-gallery__back" href="#/templates">← All page templates</a>
        <div class="svadmin-template-gallery__switcher">
          {#each navItems as item (item.id)}
            <button
              type="button"
              aria-pressed={active === item.id}
              class="svadmin-template-gallery__switch"
              onclick={() => selectTemplate(item.id)}
            >
              {item.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
    {#snippet actions()}
      <Button size="sm">Create</Button>
    {/snippet}
    {#snippet metrics()}
      <Grid columns={3} gap="sm">
        <Statistic title="Open work" value={24} trend="up" trendLabel="6 this week" />
        <Statistic title="Approval time" value={3.2} precision={1} suffix="days" trend="down" trendLabel="0.4 days" />
        <Statistic title="Satisfaction" value={96} suffix="%" trend="up" trendLabel="2.1%" />
      </Grid>
    {/snippet}
    {#snippet activity()}
      <Timeline items={activities} />
    {/snippet}
    {#snippet list()}
      <div class="svadmin-template-gallery__stack">
        {#each records as record (record.id)}
          <article class="svadmin-template-gallery__row">
            <div>
              <strong>{record.name}</strong>
              <p>{record.owner} · {record.amount}</p>
            </div>
            <Badge variant={record.status === 'Approved' ? 'default' : 'secondary'}>{record.status}</Badge>
          </article>
        {/each}
      </div>
    {/snippet}
    {#snippet cards()}
      <Grid columns={3} gap="md">
        {#each visibleCards as card (card.id)}
          <article class="svadmin-template-gallery__card">
            <Badge variant="secondary">{card.badge}</Badge>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        {/each}
      </Grid>
    {/snippet}
    {#snippet filters()}
      <div class="svadmin-template-gallery__filters">
        <Input placeholder="Search records" aria-label="Search records" />
        <Input placeholder="Owner" aria-label="Filter owner" />
      </div>
    {/snippet}
    {#snippet table()}
      <div class="svadmin-template-gallery__table" role="table" aria-label="Records">
        <div role="row" class="is-head">
          <span role="columnheader">Record</span><span role="columnheader">Owner</span><span role="columnheader">Amount</span><span role="columnheader">Status</span>
        </div>
        {#each records as record (record.id)}
          <div role="row">
            <span role="cell">{record.name}</span><span role="cell">{record.owner}</span><span role="cell">{record.amount}</span><span role="cell">{record.status}</span>
          </div>
        {/each}
      </div>
    {/snippet}
    {#snippet charts()}
      <div class="svadmin-template-gallery__chart" aria-label="Sample trend chart">
        {#each [42, 68, 54, 82, 63, 91, 74] as height, index (index)}
          <span style:height={`${height}%`}></span>
        {/each}
      </div>
    {/snippet}
    {#snippet form()}
      <div class="svadmin-template-gallery__form">
        <label>Name<Input placeholder="Workspace name" /></label>
        <label>Owner<Input placeholder="Owner" /></label>
        <label>Description<Textarea rows={4} placeholder="What should this workspace contain?" /></label>
      </div>
    {/snippet}
    {#snippet summary()}
      <div class="svadmin-template-gallery__stack">
        <h3>Summary</h3>
        <p>Review the changes before publishing. Notifications are sent after approval.</p>
        <Timeline items={timeline} />
      </div>
    {/snippet}
    {#snippet detailsBlock()}
      <dl class="svadmin-template-gallery__details">
        {#each details as [label, value] (label)}
          <div><dt>{label}</dt><dd>{value}</dd></div>
        {/each}
      </dl>
    {/snippet}
    {#snippet profile()}
      <div class="svadmin-template-gallery__profile">
        <span class="svadmin-template-gallery__avatar" aria-hidden="true">AC</span>
        <div><h3>Avery Chen</h3><p>Operations lead · Northwind</p></div>
      </div>
    {/snippet}
    {#snippet footer()}
      <Button variant="outline" size="sm">Save draft</Button>
      <Button size="sm">Publish</Button>
    {/snippet}
    {#snippet resultActions()}
      <Button size="sm" onclick={() => (active = 'workplace')}>Back to workspace</Button>
    {/snippet}
    {#snippet stepContent(index: number)}
      <div class="svadmin-template-gallery__form">
        {#if index === 0}
          <label>Name<Input placeholder="Workspace name" /></label>
          <label>Owner<Input placeholder="Owner" /></label>
        {:else if index === 1}
          <label>Team<Input placeholder="Team or group" /></label>
          <label>Visibility<Input placeholder="Private or company" /></label>
        {:else}
          <p>Review the information and publish the workspace.</p>
        {/if}
      </div>
    {/snippet}

    {#snippet dimensions()}
      <div class="svadmin-template-gallery__dimensions">
        <span>Dimension</span>
        <SegmentedControl options={dimensionOptions} bind:value={dimension} ariaLabel="Analysis dimension" />
      </div>
    {/snippet}
    {#snippet userBasicSettings()}
      <div class="svadmin-template-gallery__stack">
        <ProfilePage headingLevel="h2" />
        <NotificationsSettings headingLevel="h2" />
        <AppearanceSettings headingLevel="h2" />
      </div>
    {/snippet}
    {#snippet userSecuritySettings()}
      <div class="svadmin-template-gallery__stack">
        <SecuritySettings headingLevel="h2" />
      </div>
    {/snippet}
    {#snippet userVerificationSettings()}
      <div class="svadmin-template-gallery__stack">
        <h3>Identity verification</h3>
        <p>Review the identity checks required before sensitive workspace actions.</p>
        <TwoFactorStepper current={1} steps={['Identity', 'Verify', 'Review']} />
      </div>
    {/snippet}
    {#snippet userNews()}
      <div class="svadmin-template-gallery__stack">
        <h3>Latest news</h3>
        <article class="svadmin-template-gallery__row"><div><strong>New approval policy</strong><p>High-value requests now require two reviewers.</p></div><Badge variant="secondary">Policy</Badge></article>
        <article class="svadmin-template-gallery__row"><div><strong>Quarterly planning</strong><p>Submit team objectives before Friday.</p></div><Badge variant="outline">Planning</Badge></article>
      </div>
    {/snippet}
    {#snippet teamMembers()}
      <div class="svadmin-template-gallery__stack">
        <h3>My team</h3>
        {#each ['Mina Park', 'Noah Silva', 'Avery Chen'] as name (name)}
          <article class="svadmin-template-gallery__row"><div><strong>{name}</strong><p>Operations</p></div><Badge variant="secondary">Member</Badge></article>
        {/each}
      </div>
    {/snippet}
    {#snippet contentPercentage()}
      <div class="svadmin-template-gallery__stack">
        <h3>Content mix</h3>
        {@render charts()}
      </div>
    {/snippet}
    {#snippet monitorChat()}
      <div class="svadmin-template-gallery__stack">
        <h3>Team chat</h3>
        <article class="svadmin-template-gallery__row"><div><strong>Mina Park</strong><p>Transcode queue recovered after the restart.</p></div><span class="svadmin-template-gallery__muted">09:42</span></article>
        <article class="svadmin-template-gallery__row"><div><strong>Noah Silva</strong><p>Latency is back under the alert threshold.</p></div><span class="svadmin-template-gallery__muted">09:47</span></article>
      </div>
    {/snippet}
    {#snippet comparison()}
      <div class="svadmin-template-gallery__stack">
        <h3>Parameter comparison</h3>
        {#each comparisonRows as [label, current, previous] (label)}
          <article class="svadmin-template-gallery__row"><div><strong>{label}</strong><p>Current: {current} · Previous: {previous}</p></div></article>
        {/each}
      </div>
    {/snippet}
    {#snippet retryActions()}
      <Button size="sm" onclick={() => (active = 'advanced-form')}>Back to form</Button>
      <Button variant="outline" size="sm" onclick={() => (active = 'workplace')}>Back to workspace</Button>
    {/snippet}

    {#snippet shortcuts()}
      <div class="svadmin-template-gallery__stack">
        <h3>Shortcuts</h3>
        <div class="svadmin-template-gallery__shortcuts">
          <Button variant="outline" size="sm">New approval</Button>
          <Button variant="outline" size="sm">Open workspace</Button>
          <Button variant="outline" size="sm">Invite member</Button>
          <Button variant="outline" size="sm">Review incidents</Button>
        </div>
      </div>
    {/snippet}
    {#snippet announcements()}
      <div class="svadmin-template-gallery__stack">
        <h3>Announcements</h3>
        <article class="svadmin-template-gallery__row">
          <div><strong>Quarterly planning starts Monday</strong><p>Submit team objectives before Friday.</p></div>
          <Badge variant="secondary">Pinned</Badge>
        </article>
        <article class="svadmin-template-gallery__row">
          <div><strong>New approval policy</strong><p>High-value requests now require two reviewers.</p></div>
          <Badge variant="outline">Policy</Badge>
        </article>
      </div>
    {/snippet}
    {#snippet docs()}
      <div class="svadmin-template-gallery__stack">
        <h3>Docs</h3>
        <a class="svadmin-template-gallery__link" href="#/templates/workplace">Workspace guide</a>
        <a class="svadmin-template-gallery__link" href="#/templates/advanced-detail">Approval handbook</a>
        <a class="svadmin-template-gallery__link" href="#/templates/monitor">Incident response</a>
      </div>
    {/snippet}
    {#snippet monitorQuick()}
      <div class="svadmin-template-gallery__stack">
        <h3>Quick operations</h3>
        <div class="svadmin-template-gallery__shortcuts">
          <Button size="sm">Restart worker</Button>
          <Button variant="outline" size="sm">Rotate token</Button>
          <Button variant="outline" size="sm">Open runbook</Button>
        </div>
      </div>
    {/snippet}
    {#snippet monitorStatus()}
      <div class="svadmin-template-gallery__stack">
        <h3>Studio status</h3>
        <article class="svadmin-template-gallery__row"><div><strong>Ingestion pipeline</strong><p>No backlog detected.</p></div><Badge>Healthy</Badge></article>
        <article class="svadmin-template-gallery__row"><div><strong>Transcode queue</strong><p>2 jobs waiting.</p></div><Badge variant="secondary">Degraded</Badge></article>
      </div>
    {/snippet}
    {#snippet monitorInfo()}
      <div class="svadmin-template-gallery__stack">
        <h3>Studio information</h3>
        <dl class="svadmin-template-gallery__details">
          {#each studioDetails as [label, value] (label)}
            <div><dt>{label}</dt><dd>{value}</dd></div>
          {/each}
        </dl>
      </div>
    {/snippet}
    {#snippet bulkActions()}
      <Button size="sm">Add record</Button>
      <Button variant="outline" size="sm">Upload</Button>
      <Button variant="outline" size="sm">Export</Button>
    {/snippet}
    {#snippet pagination()}
      <ListPagination page={1} totalPages={8} total={72} rangeStart={1} rangeEnd={10} label="Records" onPageChange={() => {}} />
    {/snippet}
    {#snippet cardTabs()}
      <SegmentedControl options={cardScopeOptions} bind:value={cardScope} ariaLabel="Card category" />
    {/snippet}
    {#snippet addCard()}
      <Button variant="outline" size="sm">+ Add card</Button>
    {/snippet}
    {#snippet detailSteps()}
      <Steps current={1} items={approvalSteps} />
    {/snippet}
    {#snippet history()}
      <div class="svadmin-template-gallery__stack">
        <h3>Adjustment history</h3>
        {#each records as record (record.id)}
          <article class="svadmin-template-gallery__row">
            <div><strong>{record.name}</strong><p>{record.owner} · {record.amount}</p></div>
            <Badge variant={record.status === 'Approved' ? 'default' : 'secondary'}>{record.status}</Badge>
          </article>
        {/each}
      </div>
    {/snippet}

    {#if active === 'workplace'}
      <WorkplaceTemplate title="Workplace" description="Daily priorities, approvals and activity in one place" actions={actions} metrics={metrics} primary={list} secondary={activity} {contentPercentage} {shortcuts} {announcements} {docs} footer={footer} />
    {:else if active === 'monitor'}
      <MonitorTemplate title="Operations monitor" description="Live service health and active incidents" actions={actions} metrics={metrics} alerts={activity} activity={list} chart={charts} chat={monitorChat} quickOperations={monitorQuick} status={monitorStatus} information={monitorInfo} />
    {:else if active === 'analysis'}
      <AnalysisTemplate title="Revenue analysis" description="Filter, compare and export performance" actions={actions} filters={filters} metrics={metrics} charts={charts} records={table} />
    {:else if active === 'analysis-multi'}
      <MultiDimensionAnalysisTemplate title="Multi-dimension analysis" description="Compare regions, products and channels with the same metric definitions" actions={actions} dimensions={dimensions} metrics={metrics} chart={charts} breakdown={list} insights={activity} footer={footer} />
    {:else if active === 'search-table'}
      <SearchTableTemplate title="Search records" description="Composable filters with result summary" actions={actions} filters={filters} bulkActions={bulkActions} metrics={metrics} table={table} pagination={pagination} footer={footer} />
    {:else if active === 'card-list'}
      <CardListTemplate title="Resource library" description="Browse reusable workspace assets" actions={actions} tabs={cardTabs} filters={filters} addCard={addCard} items={cards} footer={footer} />
    {:else if active === 'group-form'}
      <GroupFormTemplate title="Create workspace" description="Group related fields into a clear form" actions={actions} form={form} summary={summary} footer={footer} />
    {:else if active === 'step-form'}
      <StepFormTemplate title="Create workspace" description="Collect information in reviewable steps" {steps} stepContent={stepContent} onfinish={finishStep} oncancel={() => (active = 'workplace')} submitText="Publish" />
    {:else if active === 'advanced-form'}
      <AdvancedFormTemplate title="Advanced request" description="Form, summary and activity side by side" actions={actions} form={form} summary={summary} footer={footer} />
    {:else if active === 'basic-detail'}
      <BasicDetailTemplate title="Request detail" description="Read-only record summary" actions={actions} steps={detailSteps} details={detailsBlock} summary={summary} comparison={comparison} history={history} footer={footer} />
    {:else if active === 'advanced-detail'}
      <AdvancedDetailTemplate title="Case detail" description="Details, approvals and related records" actions={actions} details={detailsBlock} activity={activity} related={list} metrics={metrics} footer={footer} />
    {:else if active === 'profile'}
      <ProfileTemplate title="Public profile" description="Identity, activity and shared work" actions={actions} profile={profile} activity={activity} projects={cards} />
    {:else if active === 'user-info'}
      <UserInfoTemplate title="User info" description="Projects, latest news and team context" actions={actions} header={profile} projects={cards} news={userNews} team={teamMembers} footer={footer} />
    {:else if active === 'user-settings'}
      <UserSettingsTemplate title="User settings" description="Manage profile, security and identity verification" basic={userBasicSettings} security={userSecuritySettings} verification={userVerificationSettings} />
    {:else if active === 'result'}
      <ResultTemplate status="success" title="Workspace published" subtitle="Invitations are on the way." actions={resultActions} details={detailsBlock} />
    {:else if active === 'result-error'}
      <ResultTemplate status="failure" title="Publish failed" subtitle="Resolve the validation errors and try again." actions={retryActions} details={detailsBlock} />
    {:else if active === 'exception'}
      <ExceptionTemplate status={403} actions={resultActions} />
    {:else if active === 'exception-404'}
      <ExceptionTemplate status={404} actions={resultActions} />
    {:else if active === 'exception-500'}
      <ExceptionTemplate status={500} actions={resultActions} />
    {/if}
  </main>
</div>

<style>
  .svadmin-template-gallery { display: grid; grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr); gap: var(--svadmin-space-5); padding: var(--svadmin-space-4); }
  .svadmin-template-gallery.is-standalone { grid-template-columns: minmax(0, 1fr); }
  .svadmin-template-gallery__standalone-nav { display: grid; gap: var(--svadmin-space-2); margin-block-end: var(--svadmin-space-3); }
  .svadmin-template-gallery__switcher { display: flex; gap: var(--svadmin-space-1); overflow-x: auto; padding-block-end: var(--svadmin-space-1); }
  .svadmin-template-gallery__switch { flex-shrink: 0; border: 1px solid var(--border); border-radius: 999px; padding: 0.25rem 0.625rem; background: var(--card); color: var(--muted-foreground); font: inherit; font-size: var(--svadmin-text-caption); cursor: pointer; }
  .svadmin-template-gallery__switch[aria-pressed='true'] { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }
  .svadmin-template-gallery__back { display: inline-flex; color: var(--primary); font-size: var(--svadmin-text-label); text-decoration: none; }
  .svadmin-template-gallery__back:hover { text-decoration: underline; }
  .svadmin-template-gallery__dimensions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--svadmin-space-2); color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-template-gallery__shortcuts { display: flex; flex-wrap: wrap; gap: var(--svadmin-space-2); }
  .svadmin-template-gallery__link { color: var(--primary); font-size: var(--svadmin-text-label); text-decoration: none; }
  .svadmin-template-gallery__link:hover { text-decoration: underline; }
  .svadmin-template-gallery__muted { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-template-gallery__nav { position: sticky; inset-block-start: var(--svadmin-space-4); align-self: start; padding: var(--svadmin-space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--card); }
  .svadmin-template-gallery__eyebrow { margin: 0 0 var(--svadmin-space-3); color: var(--muted-foreground); font-size: var(--svadmin-text-caption); text-transform: uppercase; letter-spacing: 0.06em; }
  .svadmin-template-gallery__main { min-width: 0; }
  .svadmin-template-gallery__stack,
  .svadmin-template-gallery__form { display: grid; gap: var(--svadmin-space-3); }
  .svadmin-template-gallery__row { display: flex; align-items: center; justify-content: space-between; gap: var(--svadmin-space-3); padding: var(--svadmin-space-3); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); }
  .svadmin-template-gallery__row p { margin: var(--svadmin-space-1) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-template-gallery__card { display: grid; gap: var(--svadmin-space-2); padding: var(--svadmin-space-4); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); }
  .svadmin-template-gallery__card h3 { margin: 0; font-size: var(--svadmin-text-body); }
  .svadmin-template-gallery__card p { margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); }
  .svadmin-template-gallery__filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: var(--svadmin-space-2); }
  .svadmin-template-gallery__table { overflow: auto; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); }
  .svadmin-template-gallery__table [role='row'] { display: grid; grid-template-columns: minmax(12rem, 2fr) repeat(3, minmax(7rem, 1fr)); gap: var(--svadmin-space-3); padding: var(--svadmin-space-2) var(--svadmin-space-3); border-block-end: 1px solid var(--border); font-size: var(--svadmin-text-label); }
  .svadmin-template-gallery__table [role='row']:last-child { border-block-end: 0; }
  .svadmin-template-gallery__table .is-head { background: var(--muted); color: var(--muted-foreground); font-weight: 600; }
  .svadmin-template-gallery__chart { display: flex; align-items: end; gap: var(--svadmin-space-2); height: 14rem; padding: var(--svadmin-space-4); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); }
  .svadmin-template-gallery__chart span { flex: 1; border-radius: var(--radius-sm) var(--radius-sm) 0 0; background: var(--primary); opacity: 0.8; }
  .svadmin-template-gallery__form label { display: grid; gap: var(--svadmin-space-1); color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-template-gallery__details { display: grid; gap: var(--svadmin-space-2); margin: 0; }
  .svadmin-template-gallery__details div { display: grid; grid-template-columns: minmax(7rem, 1fr) minmax(0, 2fr); gap: var(--svadmin-space-3); padding-block: var(--svadmin-space-2); border-block-end: 1px solid var(--border); }
  .svadmin-template-gallery__details dt { color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-template-gallery__details dd { margin: 0; color: var(--foreground); font-size: var(--svadmin-text-body); }
  .svadmin-template-gallery__profile { display: flex; align-items: center; gap: var(--svadmin-space-3); }
  .svadmin-template-gallery__profile h3 { margin: 0; }
  .svadmin-template-gallery__profile p { margin: var(--svadmin-space-1) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-template-gallery__avatar { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 999px; background: var(--accent); color: var(--accent-foreground); font-weight: 650; }
  @media (max-width: 60rem) { .svadmin-template-gallery { grid-template-columns: minmax(0, 1fr); } .svadmin-template-gallery__nav { position: static; } }
</style>