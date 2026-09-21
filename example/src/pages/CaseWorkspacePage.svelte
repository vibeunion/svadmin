<script lang="ts">
  import { onDestroy } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageShell, ContentPageHeader, MetricBlock, StatusBadge, WorkspaceStageStepper, type WorkspaceStage } from '@svadmin/ui';
  import { createCaseWorkspaceState, isCaseStageId } from './case-workspace.svelte';
  import { createCaseActions } from './case-actions';

  let { resourceName = 'case_workspace' } = $props<{ resourceName?: string }>();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  const caseState = createCaseWorkspaceState();
  const actions = createCaseActions(caseState);
  let note = $state('');
  let magnification = $state('');
  let evidenceName = $state('');
  let preview = $state('');
  let feedback = $state('');
  let technical = $state(false);
  let quality = $state(false);
  let delivered = $state(false);
  let events = $state<{ time: string; action: string }[]>([]);
  onDestroy(() => { if (preview) URL.revokeObjectURL(preview); });
  const stages = $derived<WorkspaceStage[]>([
    { id: 'overview', label: isZh ? '受理' : 'Intake', status: caseState.activeStage === 'overview' ? 'current' : caseState.caseAccepted ? 'complete' : 'pending' },
    { id: 'execution', label: isZh ? '试验执行' : 'Execution', status: caseState.activeStage === 'execution' ? 'current' : caseState.executionComplete ? 'complete' : 'pending' },
    { id: 'evidence', label: isZh ? '证据' : 'Evidence', status: caseState.activeStage === 'evidence' ? 'current' : caseState.evidenceComplete ? 'complete' : 'blocked' },
    { id: 'report', label: isZh ? '报告' : 'Report', status: caseState.activeStage === 'report' ? 'current' : delivered ? 'complete' : 'pending' },
  ]);
  const primaryLabel = $derived(caseState.activeStage === 'overview' ? (isZh ? '确认受理' : 'Accept case') : caseState.activeStage === 'execution' ? (isZh ? '提交试验记录' : 'Submit execution record') : caseState.activeStage === 'evidence' ? (isZh ? '确认本地证据' : 'Confirm local evidence') : (isZh ? '记录模拟交付' : 'Record simulated delivery'));
  function perform(action: () => void, label: string): void {
    try {
      action();
      caseState.markSaved();
      events = [...events, { time: new Date().toLocaleTimeString(), action: label }];
      feedback = isZh ? '已更新本次演示状态，刷新后重置。' : 'Demo state updated for this page session; refresh resets it.';
    } catch (error) { feedback = error instanceof Error ? error.message : (isZh ? '操作失败' : 'Operation failed'); }
  }
  function primary(): void {
    perform(() => {
      if (caseState.activeStage === 'overview') actions.advanceToExecution();
      else if (caseState.activeStage === 'execution') {
        caseState.recordExecution(note); technical = false; quality = false; delivered = false;
        actions.openEvidence();
      } else if (caseState.activeStage === 'evidence') {
        caseState.recordEvidence(evidenceName, magnification); technical = false; quality = false; delivered = false;
        actions.completeEvidence();
      } else {
        if (!technical || !quality) throw new Error(isZh ? '请完成两项模拟审核。' : 'Complete both simulated reviews.');
        delivered = true;
      }
    }, primaryLabel);
  }
  function chooseEvidence(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      feedback = isZh ? '请选择小于10MB的PNG、JPEG或WebP图片。' : 'Choose a PNG, JPEG or WebP image under 10 MB.';
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    preview = URL.createObjectURL(file); evidenceName = file.name;
    caseState.recordEvidence(evidenceName, magnification);
    technical = false; quality = false; delivered = false;
  }
</script>

{#snippet headerActions()}<Button onclick={primary}>{primaryLabel}</Button>{/snippet}
<div data-app-page="case-workspace" data-resource-name={resourceName} data-active-stage={caseState.activeStage}>
  <ContentPageShell pageId="case-workspace" width="wide">
    <p class="text-sm text-muted-foreground">{isZh ? '阶段流程演示 · 合成案件 · 仅当前页面状态，刷新重置。图片只在本机预览；无真实签发、持久化或防篡改审计。' : 'Stage-flow demo · synthetic case · page-session state resets on refresh. Images remain local; no actual sign-off, persistence or tamper-proof audit.'}</p>
    <header data-case-mission-header class="border-b pb-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <ContentPageHeader title={isZh ? '封装失效分析 · MX-47' : 'Package failure analysis · MX-47'} actions={headerActions} />
      </div>
    </header>
    <div class="flex flex-wrap items-center gap-3"><Badge variant="outline">FA-2026-0148</Badge><span class="text-sm">Jordan Lee · BGA-256</span><span class="text-sm text-muted-foreground">{caseState.savedAt ?? '—'}</span></div>
    <WorkspaceStageStepper {stages} activeId={caseState.activeStage} onselect={(stage) => { if (isCaseStageId(stage.id)) { const id = stage.id; perform(() => caseState.setStage(id), stage.label); } }} />
    {#if feedback}<p role="status">{feedback}</p>{/if}
    <section class="grid gap-3 sm:grid-cols-3">
      <MetricBlock label={isZh ? '试验记录' : 'Execution record'} value={caseState.executionComplete ? (isZh ? '已提交' : 'Submitted') : (isZh ? '待提交' : 'Pending')} />
      <MetricBlock label={isZh ? '证据' : 'Evidence'} value={caseState.evidenceComplete ? (isZh ? '已核对' : 'Confirmed') : (isZh ? '待补齐' : 'Incomplete')} />
      <MetricBlock label={isZh ? '模拟交付' : 'Simulated delivery'} value={delivered ? (isZh ? '已记录' : 'Recorded') : (isZh ? '未完成' : 'Pending')} />
    </section>
    {#if caseState.activeStage === 'overview'}
      <section class="space-y-3 border-y py-4"><h2 class="text-base font-semibold">{isZh ? '受理检查' : 'Intake review'}</h2><p class="text-sm">{isZh ? '样例：3件样品，批次B24-07。确认受理后填写试验记录，再补齐证据。' : 'Sample: 3 units, batch B24-07. Accept intake, record execution, then attach evidence.'}</p><StatusBadge status={caseState.caseAccepted ? 'success' : 'neutral'} label={caseState.caseAccepted ? (isZh ? '已受理' : 'Accepted') : (isZh ? '待受理' : 'Awaiting intake')} /></section>
    {:else if caseState.activeStage === 'execution'}
      <section class="space-y-3"><h2 class="text-base font-semibold">{isZh ? '试验记录' : 'Execution record'}</h2><label class="block text-sm">{isZh ? '方法、设备与观察结果（至少4个字符）' : 'Method, equipment and observations (at least 4 characters)'}<textarea class="mt-2 min-h-40 w-full rounded-md border bg-background p-3" bind:value={note} oninput={() => { caseState.recordExecution(note); technical = false; quality = false; delivered = false; }}></textarea></label></section>
    {:else if caseState.activeStage === 'evidence'}
      <section class="grid gap-5 md:grid-cols-2">
        <div class="space-y-4"><h2 class="text-base font-semibold">{isZh ? '本地证据' : 'Local evidence'}</h2><label class="block text-sm">{isZh ? '图片' : 'Image'}<input class="mt-2 block w-full" type="file" accept="image/png,image/jpeg,image/webp" onchange={chooseEvidence} /></label><label class="block text-sm">{isZh ? '放大倍数' : 'Magnification'}<input class="mt-2 w-full rounded-md border bg-background p-2" bind:value={magnification} oninput={() => { caseState.recordEvidence(evidenceName, magnification); technical = false; quality = false; delivered = false; }} placeholder="4x" /></label><p class="text-sm text-muted-foreground">{evidenceName || (isZh ? '尚未提供图片' : 'No image provided')}</p></div>
        {#if preview}<img src={preview} alt={isZh ? '本地案件证据预览' : 'Local case evidence preview'} class="max-h-96 w-full object-contain" />{:else}<p class="self-center text-sm text-muted-foreground">{isZh ? '缺少证据时不能进入报告。' : 'Evidence is required before proceeding to the report.'}</p>{/if}
      </section>
    {:else}
      <section class="space-y-4 border-y py-4"><h2 class="text-base font-semibold">{isZh ? '报告审核模拟' : 'Report review simulation'}</h2><p class="whitespace-pre-wrap text-sm">{caseState.executionNote}</p><p class="text-sm">{caseState.evidenceName} · {caseState.magnification}</p><label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={technical} onchange={() => delivered = false} />{isZh ? '模拟技术审核完成' : 'Simulated technical review complete'}</label><label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={quality} onchange={() => delivered = false} />{isZh ? '模拟质量审核完成' : 'Simulated quality review complete'}</label></section>
    {/if}
    <details class="border-y py-3"><summary class="cursor-pointer text-sm">{isZh ? '本页操作记录（刷新清空）' : 'Page-session activity (resets on refresh)'}</summary><div class="divide-y">{#each events as event, index (index)}<p class="py-2 text-sm">{event.time} · {event.action}</p>{:else}<p class="py-3 text-sm">{isZh ? '暂无操作' : 'No activity'}</p>{/each}</div></details>
  </ContentPageShell>
</div>
