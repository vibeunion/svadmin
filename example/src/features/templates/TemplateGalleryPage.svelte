<script lang="ts">
  import { Badge, Button, Grid, Input, Menu, Statistic, Textarea, Timeline } from '@svadmin/ui';
  import {
    AdvancedDetailTemplate,
    AdvancedFormTemplate,
    AnalysisTemplate,
    BasicDetailTemplate,
    CardListTemplate,
    ExceptionTemplate,
    GroupFormTemplate,
    MonitorTemplate,
    ProfileTemplate,
    ResultTemplate,
    SearchTableTemplate,
    StepFormTemplate,
    WorkplaceTemplate,
  } from '@svadmin/ui';
  import type { FormStep } from '@svadmin/ui/components/StepForm.svelte';

  const navItems = [
    { id: 'workplace', label: 'Workplace' },
    { id: 'monitor', label: 'Monitor' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'search-table', label: 'Search table' },
    { id: 'card-list', label: 'Card list' },
    { id: 'group-form', label: 'Group form' },
    { id: 'step-form', label: 'Step form' },
    { id: 'advanced-form', label: 'Advanced form' },
    { id: 'basic-detail', label: 'Basic detail' },
    { id: 'advanced-detail', label: 'Advanced detail' },
    { id: 'profile', label: 'Profile' },
    { id: 'result', label: 'Result' },
    { id: 'exception', label: 'Exception' },
  ];
  let active = $state('workplace');

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
    { id: 'c1', title: 'Operations handbook', description: 'Ownership, escalation paths and service levels.', badge: 'Updated' },
    { id: 'c2', title: 'Customer onboarding', description: 'Checklist, owners and first-week milestones.', badge: 'Template' },
    { id: 'c3', title: 'Incident response', description: 'Detection, triage and post-incident review.', badge: 'Critical' },
  ];
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

  function finishStep(): void {
    active = 'result';
  }
</script>

<div class="svadmin-template-gallery">
  <aside class="svadmin-template-gallery__nav" aria-label="Template navigation">
    <p class="svadmin-template-gallery__eyebrow">Page templates</p>
    <Menu items={navItems} bind:selected={active} onselect={(item) => (active = item.id)} />
  </aside>

  <main class="svadmin-template-gallery__main">
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
        {#each cardItems as card (card.id)}
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

    {#if active === 'workplace'}
      <WorkplaceTemplate title="Workplace" description="Daily priorities, approvals and activity in one place" actions={actions} metrics={metrics} primary={list} secondary={activity} footer={footer} />
    {:else if active === 'monitor'}
      <MonitorTemplate title="Operations monitor" description="Live service health and active incidents" actions={actions} metrics={metrics} alerts={activity} activity={list} chart={charts} />
    {:else if active === 'analysis'}
      <AnalysisTemplate title="Revenue analysis" description="Filter, compare and export performance" actions={actions} filters={filters} metrics={metrics} charts={charts} records={table} />
    {:else if active === 'search-table'}
      <SearchTableTemplate title="Search records" description="Composable filters with result summary" actions={actions} filters={filters} metrics={metrics} table={table} footer={footer} />
    {:else if active === 'card-list'}
      <CardListTemplate title="Resource library" description="Browse reusable workspace assets" actions={actions} filters={filters} items={cards} footer={footer} />
    {:else if active === 'group-form'}
      <GroupFormTemplate title="Create workspace" description="Group related fields into a clear form" actions={actions} form={form} summary={summary} footer={footer} />
    {:else if active === 'step-form'}
      <StepFormTemplate title="Create workspace" description="Collect information in reviewable steps" {steps} stepContent={stepContent} onfinish={finishStep} oncancel={() => (active = 'workplace')} submitText="Publish" />
    {:else if active === 'advanced-form'}
      <AdvancedFormTemplate title="Advanced request" description="Form, summary and activity side by side" actions={actions} form={form} summary={summary} footer={footer} />
    {:else if active === 'basic-detail'}
      <BasicDetailTemplate title="Request detail" description="Read-only record summary" actions={actions} details={detailsBlock} summary={summary} footer={footer} />
    {:else if active === 'advanced-detail'}
      <AdvancedDetailTemplate title="Case detail" description="Details, approvals and related records" actions={actions} details={detailsBlock} activity={activity} related={list} metrics={metrics} footer={footer} />
    {:else if active === 'profile'}
      <ProfileTemplate title="Public profile" description="Identity, activity and shared work" actions={actions} profile={profile} activity={activity} projects={cards} />
    {:else if active === 'result'}
      <ResultTemplate status="success" title="Workspace published" subtitle="Invitations are on the way." actions={resultActions} details={detailsBlock} />
    {:else if active === 'exception'}
      <ExceptionTemplate status={403} actions={resultActions} />
    {/if}
  </main>
</div>

<style>
  .svadmin-template-gallery { display: grid; grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr); gap: var(--svadmin-space-5); padding: var(--svadmin-space-4); }
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