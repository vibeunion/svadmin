<script lang="ts">
  import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    FlaskConical,
    LockKeyhole,
    PanelRight,
    Save,
    ShieldCheck,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    Badge,
    Button,
    ContentPageShell,
    MetricBlock,
    SectionHeader,
    StatusBadge,
    WorkspaceActionBar,
    WorkspaceInspector,
    WorkspaceLayout,
    WorkspaceSplitPane,
    WorkspaceStageStepper,
    type WorkspaceStage,
  } from '@svadmin/ui';
  import { createCaseActions } from './case-actions.js';
  import { createCaseWorkspaceState, type CaseStageId } from './case-workspace.svelte.js';

  let { resourceName = 'case_workspace' }: { resourceName?: string } = $props();
  const i18n = useTranslation();
  const state = createCaseWorkspaceState();
  const actions = createCaseActions(state);
  const isZh = $derived(i18n.locale === 'zh-CN');

  const stageCopy: Record<CaseStageId, [string, string]> = {
    overview: ['Cockpit', '驾驶舱'],
    execution: ['Execution', '试验执行'],
    evidence: ['Evidence', '证据中心'],
    report: ['Report', '报告签发'],
  };
  const stages = $derived.by<WorkspaceStage[]>(() => [
    { id: 'overview', label: isZh ? '综合总览' : 'Overview', description: isZh ? '门禁健康度' : 'Gate health', status: 'current' },
    { id: 'execution', label: isZh ? '试验执行' : 'Execution', description: isZh ? '4 个任务' : '4 tasks', status: 'pending' },
    { id: 'evidence', label: isZh ? '证据治理' : 'Evidence', description: isZh ? '1 项待补齐' : '1 gap', status: 'blocked' },
    { id: 'report', label: isZh ? '报告签发' : 'Report', description: isZh ? '双签' : 'Dual sign-off', status: 'pending' },
  ]);

  const stageForState = $derived.by<WorkspaceStage[]>(() => {
    return stages.map((stage) => {
      const stageId = stage.id as CaseStageId;
      const status = stageId === state.activeStage
        ? 'current'
        : stageId === 'overview' && state.caseAccepted
          ? 'complete'
          : stageId === 'execution' && state.executionComplete
            ? 'complete'
            : stageId === 'evidence' && state.evidenceComplete
              ? 'complete'
          : stageId === 'evidence'
            ? 'blocked'
            : 'pending';

      const description = stageId === 'evidence' && state.evidenceComplete
        ? (isZh ? '证据已补齐' : 'Evidence complete')
        : stage.description;

      return { ...stage, description, status };
    });
  });

  const stageLabel = $derived(stageCopy[state.activeStage][isZh ? 1 : 0]);
  const nextAction = $derived(state.activeStage === 'overview' && state.rescued
    ? (isZh ? '阻塞已解除，可继续执行' : 'Blocker rescued, continue execution')
    : state.activeStage === 'overview'
      ? (isZh ? '确认受理并开放接样' : 'Accept case and open intake')
      : state.activeStage === 'execution'
        ? (isZh ? '提交试验记录并进入证据治理' : 'Submit records and open evidence')
      : state.activeStage === 'evidence'
        ? (isZh ? '补齐 X-Ray 证据' : 'Complete X-Ray evidence')
        : (isZh ? '保存当前工作区' : 'Save workspace'));

  function selectStage(stage: WorkspaceStage): void {
    state.setStage(stage.id as CaseStageId);
  }

  function handlePrimaryAction(): void {
    if (state.activeStage === 'overview') actions.advanceToExecution();
    else if (state.activeStage === 'execution') actions.openEvidence();
    else if (state.activeStage === 'evidence') actions.completeEvidence();
    else state.markSaved();
  }
</script>

<div data-app-page="case-workspace" data-resource-name={resourceName} data-active-stage={state.activeStage}>
  <ContentPageShell pageId="case-workspace" width="wide" class="space-y-5">
    <header class="border-b border-border pb-4" data-case-mission-header>
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="outline">FA-2026-0148</Badge>
            <StatusBadge status="warning" label={isZh ? '加急 · SLA 18:42' : 'Urgent · SLA 18:42'} />
          </div>
          <h1 class="mt-2 text-xl font-semibold text-foreground">{isZh ? '封装失效分析 · MX-47' : 'Package failure analysis · MX-47'}</h1>
          <p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{isZh ? 'Acme Semiconductor · BGA-256 · 批次 B24-07 · 当前阶段：' : 'Acme Semiconductor · BGA-256 · Batch B24-07 · Current stage: '}{stageLabel}</p>
        </div>
        <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4 xl:text-right">
          <div><p class="text-muted-foreground">{isZh ? '负责人' : 'Owner'}</p><p class="mt-1 font-medium text-foreground">Jordan Lee</p></div>
          <div><p class="text-muted-foreground">{isZh ? '样品' : 'Samples'}</p><p class="mt-1 font-medium text-foreground">3 / 3</p></div>
          <div><p class="text-muted-foreground">{isZh ? '更新时间' : 'Updated'}</p><p class="mt-1 font-medium text-foreground">{state.savedAt ?? (isZh ? '刚刚' : 'Just now')}</p></div>
          <div><p class="text-muted-foreground">{isZh ? '审计' : 'Audit'}</p><p class="mt-1 inline-flex items-center gap-1 font-medium text-success"><ShieldCheck class="size-3.5" />{isZh ? '已开启' : 'On'}</p></div>
        </div>
      </div>
      <WorkspaceStageStepper stages={stageForState} activeId={state.activeStage} onselect={selectStage} class="mt-5" ariaLabel={isZh ? '案件阶段流' : 'Case stage flow'} />
    </header>

    <WorkspaceActionBar title={nextAction} status={state.activeStage === 'evidence' && !state.evidenceComplete ? (isZh ? '存在阻塞' : 'Blocked') : undefined} description={isZh ? '主行动随案件阶段变化，辅助管理动作保留在上下文区域。' : 'The primary action follows the case stage; supporting operations stay in context.'}>
      {#snippet primaryAction()}
        <Button size="sm" onclick={handlePrimaryAction}>
          {#if state.activeStage === 'overview'}<CheckCircle2 class="size-4" />{:else if state.activeStage === 'execution'}<ArrowRight class="size-4" />{:else if state.activeStage === 'evidence'}<FileCheck2 class="size-4" />{:else}<Save class="size-4" />{/if}
          {isZh ? '执行主行动' : 'Run primary action'}
        </Button>
      {/snippet}
      {#snippet secondaryActions()}
        <Button variant="outline" size="sm" onclick={() => state.toggleInspector()}><PanelRight class="size-4" />{isZh ? '上下文' : 'Context'}</Button>
      {/snippet}
    </WorkspaceActionBar>

    <div class="contents">
    {#snippet mainContent()}
      <div class="space-y-5">
        {#if state.activeStage === 'overview'}
          <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricBlock label={isZh ? '样品就绪度' : 'Sample readiness'} value="3 / 3" detail={isZh ? '封条完好 · A-02' : 'Seals intact · A-02'} trend="100%" trendTone="positive" />
            <MetricBlock label={isZh ? '方案合规度' : 'Plan compliance'} value="V1.2" detail={isZh ? '已通过技术评审' : 'Technical review passed'} trend="Ready" trendTone="positive" />
            <MetricBlock label={isZh ? '任务执行度' : 'Task execution'} value="2 / 4" detail={isZh ? '1 项进行中' : '1 in progress'} trend="50%" trendTone="warning" />
            <MetricBlock label={isZh ? '报告完备度' : 'Report readiness'} value="82%" detail={isZh ? '待补 1 项证据' : '1 evidence gap'} trend="Watch" trendTone="warning" />
          </section>
          <section class="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <div class="rounded-lg border border-border bg-card">
              <div class="border-b border-border p-4"><SectionHeader title={isZh ? '阶段门禁健康度' : 'Stage gate health'} description={isZh ? '当前页面只保留会改变推进决策的事实。' : 'Only decision-changing facts stay in the cockpit.'} /></div>
              <div class="divide-y divide-border">
                {#each [{ label: isZh ? '样品监管链' : 'Chain of custody', value: isZh ? '已核验' : 'Verified', status: 'success', Icon: LockKeyhole }, { label: isZh ? '方案评审' : 'Plan review', value: isZh ? 'V1.2 已通过' : 'V1.2 passed', status: 'success', Icon: ClipboardCheck }, { label: isZh ? '试验执行' : 'Execution', value: isZh ? 'X-Ray 进行中' : 'X-Ray in progress', status: 'warning', Icon: FlaskConical }, { label: isZh ? '报告签发' : 'Report sign-off', value: isZh ? '等待技术签发' : 'Awaiting technical sign-off', status: 'neutral', Icon: FileCheck2 }] as gate (gate.label)}
                  <div class="flex items-center justify-between gap-4 p-4"><div class="flex min-w-0 items-center gap-3"><span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><gate.Icon class="size-4" /></span><span class="truncate text-sm font-medium text-foreground">{gate.label}</span></div><StatusBadge status={gate.status as 'success' | 'warning' | 'neutral'} label={gate.value} /></div>
                {/each}
              </div>
            </div>
            <aside class="rounded-lg border border-border bg-card p-4"><SectionHeader title={isZh ? '关键卡点' : 'Open blockers'} description={isZh ? '阻塞必须带恢复路径。' : 'Every blocker has a recovery path.'} /><div class="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3"><div class="flex items-start gap-2"><AlertTriangle class="mt-0.5 size-4 text-warning-foreground" /><div><p class="text-sm font-medium text-foreground">{isZh ? 'X-Ray 切片缺少放大倍数' : 'X-Ray slice missing magnification'}</p><p class="mt-1 text-xs leading-5 text-muted-foreground">{isZh ? '候选救援人：Maya Ortiz · 预计 12 分钟' : 'Rescue candidate: Maya Ortiz · ETA 12 min'}</p><Button variant="outline" size="sm" class="mt-3" onclick={actions.rescueBlocker}>{isZh ? '一键派工救援' : 'Rescue blocker'}</Button></div></div></div></aside>
          </section>
        {:else if state.activeStage === 'execution'}
          <section class="rounded-lg border border-border bg-card"><div class="border-b border-border p-4"><SectionHeader title={isZh ? 'ELN 试验执行网格' : 'ELN execution grid'} description={isZh ? '紧凑表格用于重复录入，详情和阻塞保留在当前上下文。' : 'A compact grid for repeated entry; detail and blockers stay in context.'} /></div><div class="overflow-x-auto p-3"><table class="w-full min-w-[48rem] border-collapse text-left text-xs"><thead><tr class="border-b border-border bg-muted/25 text-muted-foreground"><th class="h-8 px-2 font-medium">{isZh ? '步骤' : 'Step'}</th><th class="h-8 px-2 font-medium">{isZh ? '试验项目 / 方法' : 'Method'}</th><th class="h-8 px-2 font-medium">{isZh ? '执行人' : 'Owner'}</th><th class="h-8 px-2 font-medium">{isZh ? '设备' : 'Equipment'}</th><th class="h-8 px-2 font-medium">{isZh ? '状态' : 'Status'}</th><th class="h-8 px-2 font-medium">{isZh ? '证据' : 'Evidence'}</th></tr></thead><tbody>{#each [{ step: '01', method: 'Visual inspection', owner: 'Jordan Lee', equipment: 'Optical scope', status: 'Done', evidence: '4' }, { step: '02', method: 'X-Ray CT', owner: 'Maya Ortiz', equipment: 'Nikon XT H 225', status: 'In progress', evidence: '2' }, { step: '03', method: 'Cross-section', owner: 'Noah Patel', equipment: 'Leica EM TXP', status: 'Queued', evidence: '0' }, { step: '04', method: 'SEM / EDS', owner: 'Jordan Lee', equipment: 'JEOL JSM-IT', status: 'Queued', evidence: '0' }] as task (task.step)}<tr class="border-b border-border/70 last:border-0"><td class="h-9 px-2 font-mono text-muted-foreground">{task.step}</td><td class="h-9 px-2 font-medium text-foreground">{task.method}</td><td class="h-9 px-2 text-muted-foreground">{task.owner}</td><td class="h-9 px-2 text-muted-foreground">{task.equipment}</td><td class="h-9 px-2"><StatusBadge status={task.status === 'Done' ? 'success' : task.status === 'In progress' ? 'warning' : 'neutral'} label={task.status} /></td><td class="h-9 px-2 font-medium text-foreground">{task.evidence}</td></tr>{/each}</tbody></table></div></section>
        {:else if state.activeStage === 'evidence'}
          <WorkspaceSplitPane secondaryWidth="38%">
            {#snippet primary()}<SectionHeader title={isZh ? '报告段落 · 失效现象' : 'Report section · Failure signature'} description={isZh ? '左侧内容与右侧证据保持同一阶段上下文。' : 'The report section stays in the same stage context as evidence.'} /><div class="mt-4 space-y-3"><div class="rounded-md border border-border bg-background p-3 text-sm leading-6 text-foreground">{isZh ? '观察到焊球区域存在局部空洞，需结合 X-Ray 切片确认是否与热循环应力相关。' : 'Localized voiding is visible around the solder ball region; correlate with the X-Ray slice before concluding thermal-cycle stress.'}</div><div class="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning-foreground"><AlertTriangle class="mr-1 inline size-3.5" />{isZh ? '证据规则：放大倍数未标注。' : 'Evidence rule: magnification is missing.'}</div></div>{/snippet}
            {#snippet secondary()}<SectionHeader title={isZh ? '证据预览' : 'Evidence preview'} description={isZh ? '查看、标注和补齐证据。' : 'Review, annotate, and complete evidence.'} /><div class="mt-4 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-border bg-muted/30"><div class="text-center"><FlaskConical class="mx-auto size-10 text-primary" /><p class="mt-3 text-sm font-medium text-foreground">X-Ray slice 02</p><p class="mt-1 text-xs text-muted-foreground">1024 × 768 · 4× · annotation pending</p></div></div>{/snippet}
          </WorkspaceSplitPane>
        {:else}
          <section class="rounded-lg border border-border bg-card"><div class="border-b border-border p-4"><SectionHeader title={isZh ? '受控报告工作区' : 'Controlled report station'} description={isZh ? '报告版本、双签状态和交付回执集中在当前阶段。' : 'Version, dual sign-off, and delivery receipt stay in this stage.'} /></div><div class="divide-y divide-border"><div class="flex items-center justify-between gap-4 p-4"><div><p class="text-sm font-medium text-foreground">{isZh ? '技术审核' : 'Technical review'}</p><p class="mt-1 text-xs text-muted-foreground">Jordan Lee · V1.3</p></div><StatusBadge status="success" label={isZh ? '已通过' : 'Passed'} /></div><div class="flex items-center justify-between gap-4 p-4"><div><p class="text-sm font-medium text-foreground">{isZh ? '质量审核' : 'Quality review'}</p><p class="mt-1 text-xs text-muted-foreground">Maya Ortiz · V1.3</p></div><StatusBadge status="warning" label={isZh ? '待签发' : 'Pending'} /></div><div class="flex items-center justify-between gap-4 p-4"><div><p class="text-sm font-medium text-foreground">{isZh ? '受控交付' : 'Controlled delivery'}</p><p class="mt-1 text-xs text-muted-foreground">{isZh ? '审核完成后生成带水印回执' : 'Watermarked receipt after both reviews'}</p></div><StatusBadge status="neutral" label={isZh ? '未开始' : 'Not started'} /></div></div></section>
        {/if}
      </div>
    {/snippet}

    {#snippet contextContent()}
      <WorkspaceInspector title={isZh ? '案件上下文' : 'Case context'} description={isZh ? '不离开当前阶段查看关联信息。' : 'Related information without leaving the stage.'} open={state.inspectorOpen} ontoggle={(open: boolean) => state.toggleInspector(open)}>
        <div class="space-y-5">
          <section><p class="text-xs font-medium text-muted-foreground">{isZh ? '样品监管链' : 'Chain of custody'}</p><div class="mt-3 space-y-3"><div class="flex gap-3"><span class="mt-1 size-2 shrink-0 rounded-full bg-success"></span><div><p class="text-xs font-medium text-foreground">{isZh ? '已入库 · A-02' : 'Received · A-02'}</p><p class="mt-1 text-[0.6875rem] text-muted-foreground">Jun 12 · 09:14 · Jordan Lee</p></div></div><div class="flex gap-3"><span class="mt-1 size-2 shrink-0 rounded-full bg-success"></span><div><p class="text-xs font-medium text-foreground">{isZh ? '封条核验' : 'Seal verified'}</p><p class="mt-1 text-[0.6875rem] text-muted-foreground">Jun 12 · 09:26 · Maya Ortiz</p></div></div></div></section>
          <section class="border-t border-border pt-4"><p class="text-xs font-medium text-muted-foreground">{isZh ? '项目成员' : 'Project members'}</p><div class="mt-3 space-y-2 text-xs"><div class="flex items-center justify-between"><span class="text-foreground">Jordan Lee</span><span class="text-muted-foreground">Technical</span></div><div class="flex items-center justify-between"><span class="text-foreground">Maya Ortiz</span><span class="text-muted-foreground">Quality</span></div><div class="flex items-center justify-between"><span class="text-foreground">Noah Patel</span><span class="text-muted-foreground">Lab</span></div></div></section>
          <section class="border-t border-border pt-4"><p class="text-xs font-medium text-muted-foreground">{isZh ? '审计履历' : 'Audit trail'}</p><p class="mt-2 text-xs leading-5 text-muted-foreground">{isZh ? '所有阶段推进、证据变更和签发动作都会进入不可篡改审计流。' : 'Stage changes, evidence updates, and sign-off actions are recorded in the append-only audit stream.'}</p></section>
        </div>
      </WorkspaceInspector>
    {/snippet}

    <WorkspaceLayout primary={mainContent} secondary={contextContent} secondaryWidth="20rem" secondaryCollapsed={!state.inspectorOpen} secondaryCollapsedWidth="3.5rem" />
    </div>
  </ContentPageShell>
</div>
