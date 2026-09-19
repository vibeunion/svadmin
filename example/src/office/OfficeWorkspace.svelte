<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, ContentPageShell, MetricBlock, StatusBadge, SectionHeader } from '@svadmin/ui';
  import { actors, views, can, canView, isView, createOfficeData, visibleReports, visibleAlerts, reportById, completionBlockers, executeOfficeCommand, officeMetrics, reportLabels, checkLabels, alertLabels, type OfficeCommand, type OfficeView, type AlertTask } from './domain';
  import './office.css';

  // 实际产品须由后端提供会话、范围授权、持久化和命令幂等；这里仅有合成数据。
  let data = $state.raw(createOfficeData());
  let actorId = $state('worker');
  let view = $state<OfficeView>('dashboard');
  let reportId = $state('DEMO-R001');
  let alertId = $state('DEMO-A001');
  let search = $state('');
  let statusFilter = $state('all');
  let levelFilter = $state('all');
  let reportPage = $state(1);
  let note = $state('');
  let evidence = $state('');
  let disposition = $state<NonNullable<AlertTask['result']>>('handled');
  let workingText = $state('');
  let workingValue = $state('');
  let formRevision = $state(1);
  let alertRevision = $state(1);
  let selectedFiles = $state<{ name: string; size: number }[]>([]);
  let transfer = $state(false);
  let feedback = $state('');
  let feedbackError = $state(false);
  let reportTab = $state<'indicators' | 'original' | 'history'>('indicators');

  function required<T>(value: T | undefined): T {
    if (value === undefined) throw new Error('演示配置缺失，请重新加载工作区');
    return value;
  }
  const actor = $derived(required(actors.find((item) => item.id === actorId) ?? actors[0]));
  const reports = $derived(visibleReports(data, actor));
  const alerts = $derived(visibleAlerts(data, actor));
  const report = $derived(reportById(data, actor, reportId));
  const alert = $derived(alerts.find((item) => item.id === alertId));
  const metrics = $derived(officeMetrics(data, actor));
  const activeView = $derived(required(views.find((item) => item.id === view)));
  const disabledActor = $derived(data.staff.some((item) => item.id === actorId && !item.active));
  const permitted = $derived(canView(actor, view) && !disabledActor);
  const suggestions = $derived(data.suggestions.filter((item) => item.reportId === report?.id));
  const messages = $derived(data.messages.filter((item) => reports.some((entry) => entry.id === item.reportId)));
  const filteredReports = $derived(reports.filter((item) => (statusFilter === 'all' || item.status === statusFilter) && `${item.id} ${item.person} ${item.institution}`.toLowerCase().includes(search.trim().toLowerCase())));
  const filteredAlerts = $derived(alerts.filter((item) => levelFilter === 'all' || String(item.level) === levelFilter).sort((a, b) => a.level - b.level || a.dueAt.localeCompare(b.dueAt)));
  const pageCount = $derived(Math.max(1, Math.ceil(filteredReports.length / 3)));
  const pageRows = $derived(filteredReports.slice((Math.min(reportPage, pageCount) - 1) * 3, Math.min(reportPage, pageCount) * 3));
  const contentDirty = $derived((view === 'proofreading' && !!report && workingText !== report.draft) || (view === 'verification' && !!report && workingValue !== report.observations[0]?.value));
  const dirty = $derived(contentDirty || (['verification', 'proofreading', 'alert', 'rules'].includes(view) && (note.trim().length > 0 || evidence.trim().length > 0)));
  const blockers = $derived(report ? completionBlockers(data, report) : []);
  const ruleLabels = { draft: '草稿', review: '待独立复核', approved: '已复核', published: '演示发布完成' };
  const suggestionLabels = { pending: '待处理', accepted: '已采纳', ignored: '已忽略', stale: '已失效，需重新检查' };

  function loadForms(): void {
    const current = reportById(data, actor, reportId);
    workingText = current?.draft ?? '';
    workingValue = current?.observations[0]?.value ?? '';
    formRevision = current?.revision ?? 0;
    alertRevision = visibleAlerts(data, actor).find((item) => item.id === alertId)?.revision ?? 0;
    note = ''; evidence = ''; disposition = 'handled';
  }
  function confirmLeave(): boolean { return !dirty || window.confirm('当前修改尚未保存。放弃修改并离开？'); }
  function navigate(next: OfficeView, id?: string, taskId?: string): void {
    if (!confirmLeave()) return;
    view = next; if (id !== undefined) reportId = id; if (taskId !== undefined) alertId = taskId;
    feedback = ''; reportTab = 'indicators'; loadForms();
    const url = new URL(window.location.href);
    url.searchParams.set('officeView', next);
    url.searchParams.set('officeReport', reportId);
    url.searchParams.set('officeAlert', alertId);
    window.history.pushState({}, '', url);
  }
  function readLocation(): void {
    const params = new URL(window.location.href).searchParams;
    const next = params.get('officeView');
    view = isView(next) ? next : 'dashboard';
    reportId = params.get('officeReport') ?? 'DEMO-R001';
    alertId = params.get('officeAlert') ?? 'DEMO-A001';
    loadForms();
  }
  function changeActor(next: string): void {
    if (!confirmLeave()) return;
    actorId = next; feedback = ''; loadForms();
  }
  function run(command: OfficeCommand, message: string): boolean {
    try {
      data = executeOfficeCommand(data, actor, command);
      feedback = message; feedbackError = false; loadForms(); return true;
    } catch (error) {
      feedback = error instanceof Error ? error.message : '操作失败，请保留当前内容后重试'; feedbackError = true; return false;
    }
  }
  function formatTime(value: string): string { return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  function stateTone(state: string): 'success' | 'warning' | 'neutral' { return ['complete', 'closed', 'manual', 'approved'].includes(state) ? 'success' : ['failed', 'stale', 'blocked', 'review', 'waiting'].includes(state) ? 'warning' : 'neutral'; }
  function manual(check: 'anomaly' | 'proof'): void {
    if (report) run({ type: 'manual', reportId: report.id, revision: formRevision, check, note }, '已记录人工检查和依据，未伪装为自动检查结果。');
  }
  onMount(() => {
    readLocation();
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    const popState = () => { if (dirty && !window.confirm('返回将放弃未保存修改，是否继续？')) { window.history.forward(); return; } readLocation(); };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', popState);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('popstate', popState); };
  });
</script>

<ContentPageShell pageId="health-office" width="wide">
  <div class="office" data-office-workspace data-office-view={view}>
    <div class="office-demo"><strong>交互演示 · 非生产系统</strong><span>仅使用合成数据，刷新即重置；文件内容不上传。身份切换仅用于演示，不是登录或服务端授权。</span></div>
    <header class="office-header">
      <div><p class="office-eyebrow">SVADMIN / HEALTH OFFICE</p><h1>智能辅助办公</h1><p class="office-subtitle">从报告接入到审核闭环，让每一项提示都有明确的下一步。</p></div>
      <label class="office-identity">演示身份<select aria-label="切换演示身份" value={actorId} onchange={(event) => changeActor(event.currentTarget.value)}>{#each actors as item (item.id)}<option value={item.id}>{item.name}{data.staff.some((entry) => entry.id === item.id && !entry.active) ? '（已停用）' : ''}</option>{/each}</select></label>
    </header>
    <nav class="office-nav" aria-label="辅助办公业务导航">{#each views.filter((item) => !item.detail && canView(actor, item.id)) as item (item.id)}<button type="button" class:active={view === item.id} aria-current={view === item.id ? 'page' : undefined} onclick={() => navigate(item.id)}>{item.label}{#if item.id === 'alerts' && metrics.open}<span>{metrics.open}</span>{/if}</button>{/each}</nav>
    <div class="office-context"><span>{activeView.page} / {activeView.label}</span><span>北区演示范围 · 不含其他部门记录</span></div>
    <div class="office-feedback" class:error={feedbackError} role="status" aria-live="polite">{feedback}</div>

    {#if !permitted}
      <section class="office-empty" data-office-denied><span class="office-empty-symbol">—</span><h2>{disabledActor ? '该演示账号已停用' : '当前身份无权查看此页面'}</h2><p>配置管理员不自动获得健康数据权限。请切换到具有相应权限的演示身份；真实权限须由后端重新校验。</p></section>
    {:else if view === 'dashboard'}
      <section class="office-metrics" aria-label="授权范围内的工作量"><MetricBlock label="待核对报告" value={String(metrics.verify)} detail="身份与关键指标待确认" /><MetricBlock label="一级预警待办" value={String(metrics.critical)} detail="确认不等于处置完成" /><MetricBlock label="未关闭预警" value={String(metrics.open)} detail="包含待独立复核任务" /><MetricBlock label="已完成报告" value={`${metrics.complete} / ${metrics.reports}`} detail="当前合成数据快照" /></section>
      <div class="office-grid">
        <section class="office-panel"><div class="office-panel-heading"><SectionHeader title="优先处理" description="一级预警优先，其次完成数据核对。" /><Button size="sm" variant="outline" onclick={() => navigate('alerts')}>全部预警</Button></div>
          {#each alerts.filter((item) => item.state !== 'closed').sort((a, b) => a.level - b.level) as item (item.id)}<div class="office-task"><div class="office-task-number" class:critical={item.level === 1}>{item.level}</div><div class="office-task-text"><strong>{item.title}</strong><p>{item.reportId} · {alertLabels[item.state]} · 责任人：{item.owner === 'queue' ? '部门队列' : item.owner}</p><small>演示到期时间：{formatTime(item.dueAt)}（上海时区）</small></div><Button size="sm" onclick={() => navigate('alert', item.reportId, item.id)}>处理任务</Button></div>{/each}
          {#if metrics.open === 0}<div class="office-empty"><p>当前范围内没有未关闭预警。</p></div>{/if}
        </section>
        <aside class="office-panel"><SectionHeader title="审核完成条件" description="缺失的检查不会被系统当作正常。" /><div class="office-checklist"><p><span>01</span>身份和关键指标已核对</p><p><span>02</span>异常检查与文本校对有结果</p><p><span>03</span>预警处置及必要复核完成</p><p><span>04</span>无待办建议、未保存修改或冲突</p></div><Button variant="outline" onclick={() => navigate('reports')}>进入报告中心</Button><div class="office-note">真实 OCR、校对、预警服务与通知网关尚未接入。失败样例提供人工接管入口。</div></aside>
      </div>
      <section class="office-panel"><div class="office-panel-heading"><SectionHeader title="继续核对报告" description="所有人员、指标和结果均为合成演示数据。" /><Button size="sm" onclick={() => navigate('imports')}>导入预检</Button></div><div class="office-table-wrap"><table><caption class="office-sr-only">需要核对的报告</caption><thead><tr><th>报告与人员</th><th>机构</th><th>质量状态</th><th>下一步</th></tr></thead><tbody>{#each reports.filter((item) => item.quality !== 'verified') as item (item.id)}<tr><td><strong>{item.person}</strong><small>{item.id}</small></td><td>{item.institution}</td><td>{item.quality === 'blocked' ? '身份冲突，禁止直接通过' : '待人工核对'}</td><td><Button size="sm" variant="outline" onclick={() => navigate('verification', item.id)}>查看并核对</Button></td></tr>{/each}</tbody></table></div></section>
    {:else if view === 'reports'}
      <section class="office-panel"><div class="office-panel-heading"><SectionHeader title="报告中心" description="保留原始值、来源、当前检查状态与审核版本。" /><Button size="sm" onclick={() => navigate('imports')}>导入报告</Button></div><div class="office-toolbar"><label class="office-grow">搜索授权范围<input aria-label="搜索报告" placeholder="报告编号、合成人员或机构" bind:value={search} oninput={() => { reportPage = 1; }} /></label><label>审核状态<select bind:value={statusFilter} onchange={() => { reportPage = 1; }}><option value="all">全部状态</option><option value="pending">待审核</option><option value="in_review">审核中</option><option value="complete">已完成</option></select></label><Button variant="outline" size="sm" onclick={() => { search = ''; statusFilter = 'all'; reportPage = 1; }}>重置条件</Button></div>
        <div class="office-table-wrap"><table><caption class="office-sr-only">授权范围内报告列表</caption><thead><tr><th>报告 / 人员</th><th>机构 / 日期</th><th>质量状态</th><th>检查状态</th><th>审核状态</th><th>操作</th></tr></thead><tbody>{#each pageRows as item (item.id)}<tr><td><strong>{item.person}</strong><small>{item.id} · {item.maskedIdentity}</small></td><td>{item.institution}<small>{item.date}</small></td><td>{item.quality === 'verified' ? '已核对' : item.quality === 'blocked' ? '身份冲突' : '待核对'}</td><td>{checkLabels[item.anomaly]}</td><td><StatusBadge status={stateTone(item.status)} label={reportLabels[item.status]} /></td><td><Button size="sm" variant="outline" onclick={() => navigate('report', item.id)}>查看报告</Button></td></tr>{/each}</tbody></table></div>
        {#if !filteredReports.length}<div class="office-empty"><h3>没有符合条件的报告</h3><p>调整筛选条件；不会返回其他部门的内容或数量。</p></div>{/if}
        <div class="office-pagination"><span>共 {filteredReports.length} 份 · 第 {Math.min(reportPage, pageCount)} / {pageCount} 页</span><div class="office-actions"><Button variant="outline" size="sm" disabled={reportPage <= 1} onclick={() => { reportPage -= 1; }}>上一页</Button><Button variant="outline" size="sm" disabled={reportPage >= pageCount} onclick={() => { reportPage += 1; }}>下一页</Button></div></div>
      </section>
    {:else if view === 'imports'}
      <section class="office-panel"><SectionHeader title="批量导入预检" description="先校验来源与文件，再由接入服务创建解析任务。" /><div class="office-note">本页仅检查文件名、大小和扩展名，不读取内容、不上传、不进行病毒检测或真实格式判定。有效文件显示“等待接入”，不是“解析成功”。</div><form class="office-import" onsubmit={(event) => { event.preventDefault(); if (run({ type: 'import', files: selectedFiles }, '预检清单已建立。所有文件仍保留在本机，未创建报告。')) selectedFiles = []; }}><label>来源机构<select disabled><option>演示机构·北区（固定样例）</option></select></label><label>选择文件（建议每批 100 个、单文件 50 MB）<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" aria-label="选择报告文件" onchange={(event) => { selectedFiles = Array.from(event.currentTarget.files ?? []).map((file) => ({ name: file.name, size: file.size })); }} /></label><p>已选择 {selectedFiles.length} 个文件。请勿选择真实健康资料。</p><Button type="submit" disabled={!selectedFiles.length}>建立本地预检清单</Button></form></section>
      <section class="office-panel"><SectionHeader title="导入项" description="逐项呈现错误，不伪造处理百分比。" /><div class="office-table-wrap"><table><thead><tr><th>文件</th><th>状态</th><th>原因</th><th>操作</th></tr></thead><tbody>{#each data.imports as item (item.id)}<tr><td>{item.filename}<small>{item.id} · {item.size} B</small></td><td>{item.state === 'blocked' ? '等待接入' : item.state === 'rejected' ? '已拒绝' : '已取消'}</td><td>{item.reason}</td><td><Button variant="outline" size="sm" disabled={item.state !== 'blocked'} onclick={() => run({ type: 'cancel-import', jobId: item.id }, '已取消该未上传项，既有报告未被删除。')}>取消</Button></td></tr>{/each}</tbody></table></div>{#if !data.imports.length}<div class="office-empty"><p>尚无导入项。文件预检失败不会影响其他项。</p></div>{/if}</section>
    {:else if view === 'report' || view === 'verification' || view === 'proofreading'}
      {#if !report}<section class="office-empty"><h2>报告不存在或不在授权范围内</h2><p>请从报告中心选择可访问的记录。</p><Button onclick={() => navigate('reports')}>返回报告中心</Button></section>
      {:else}
        <section class="office-report-header"><div><p class="office-eyebrow">{report.id} / V{report.revision}</p><h2>{report.person}</h2><p>{report.institution} · {report.date} · {report.maskedIdentity}</p></div><div class="office-actions"><StatusBadge status={stateTone(report.status)} label={reportLabels[report.status]} /><Button variant="outline" size="sm" onclick={() => navigate('reports')}>返回列表</Button></div></section>
        <nav class="office-subnav" aria-label="报告工作区域"><button class:active={view === 'report'} onclick={() => navigate('report', report.id)}>报告详情</button><button class:active={view === 'verification'} onclick={() => navigate('verification', report.id)}>数据核对</button><button class:active={view === 'proofreading'} onclick={() => navigate('proofreading', report.id)}>文档校对</button></nav>
        {#if view === 'report'}
          <div class="office-grid"><section class="office-panel"><div class="office-panel-heading"><SectionHeader title="报告内容" description="原文、派生指标和审核稿分别保留。" /><select aria-label="报告内容视图" bind:value={reportTab}><option value="indicators">结构化指标</option><option value="original">原文证据</option><option value="history">变更历史</option></select></div>
            {#if reportTab === 'indicators'}<div class="office-table-wrap"><table><thead><tr><th>项目</th><th>当前 / 原始结果</th><th>单位</th><th>参考范围</th><th>演示判定</th><th>来源</th></tr></thead><tbody>{#each report.observations as item (item.id)}<tr><td>{item.name}</td><td><strong>{item.value}</strong><small>原始：{item.original}</small></td><td>{item.unit}</td><td>{item.reference}</td><td>{item.verdict === 'unknown' ? '无法判定' : item.verdict === 'abnormal' ? '异常（固定样例）' : '正常（固定样例）'}</td><td>{item.page ? `源页码 ${item.page}；区域待接入` : '无定位信息'}</td></tr>{/each}</tbody></table></div>
            {:else if reportTab === 'original'}{#if can(actor, 'original')}<div class="office-document"><h3>合成原文文本</h3><p>{report.originalText}</p><div class="office-note">当前没有机构原始文件，不能预览或下载真实 PDF。页码来自固定样例，不提供伪造的定位高亮。</div></div>{:else}<div class="office-empty"><h3>未授予原件访问权限</h3><p>可以查看结构化内容，不代表可以查看或下载未脱敏原件。</p></div>{/if}
            {:else}<div class="office-timeline">{#each data.changes.filter((item) => item.kind === 'report' && item.object === report.id) as item (item.id)}<article><strong>{item.actor} · {formatTime(item.time)}</strong><p>{item.reason}</p><small>{'revision' in item.before ? `V${item.before.revision}` : ''} → {'revision' in item.after ? `V${item.after.revision}` : ''}</small>{#if 'draft' in item.before && 'draft' in item.after && item.before.draft !== item.after.draft}<details><summary>查看审核稿差异</summary><p>修改前：{item.before.draft}</p><p>修改后：{item.after.draft}</p></details>{/if}</article>{/each}{#if !data.changes.some((item) => item.kind === 'report' && item.object === report.id)}<p>本会话尚无修改。已载入版本为固定合成样例。</p>{/if}</div>{/if}
          </section><aside class="office-panel"><SectionHeader title="完成审核检查" description="任何阻塞未解除，都不能标记完成。" /><dl class="office-facts"><div><dt>异常检查</dt><dd>{checkLabels[report.anomaly]}</dd></div><div><dt>文本校对</dt><dd>{checkLabels[report.proof]}</dd></div></dl>{#each blockers as item (item)}<p class="office-blocker">待完成 · {item}</p>{/each}{#if !blockers.length}<p class="office-note">完成条件已满足，可以提交审核结果。</p>{/if}<Button disabled={blockers.length > 0 || report.status === 'complete'} onclick={() => run({ type: 'complete', reportId: report.id, revision: formRevision }, '本会话报告审核已完成，后续修改将重开。')}>完成审核</Button><p class="office-muted">PDF / Excel 导出尚未接入受控导出服务。</p><Button size="sm" variant="outline" disabled>受控导出（未接入）</Button></aside></div>
          <section class="office-panel"><SectionHeader title="关联预警" description="查看不改变预警状态。" />{#each alerts.filter((item) => item.reportId === report.id) as item (item.id)}<div class="office-task"><div class="office-task-text"><strong>{item.title}</strong><p>{alertLabels[item.state]} · {item.id}</p></div><Button size="sm" variant="outline" onclick={() => navigate('alert', report.id, item.id)}>查看处置</Button></div>{/each}{#if !alerts.some((item) => item.reportId === report.id)}<p class="office-muted">当前快照没有关联预警；不代表未执行的检查已正常。</p>{/if}</section>
        {:else if view === 'verification'}
          <div class="office-grid"><section class="office-panel"><SectionHeader title="数据核对" description="修正派生值，不覆盖原始结果。" />{#if report.quality === 'blocked'}<div class="office-note office-danger">身份匹配有冲突。需要来源系统核实和受控改绑，本演示不会提供一键绕过。</div>{/if}<dl class="office-facts"><div><dt>原始项目结果</dt><dd>{report.observations[0]?.original}</dd></div><div><dt>源单位</dt><dd>{report.observations[0]?.unit}</dd></div><div><dt>来源</dt><dd>固定合成文本；原始文件未接入</dd></div></dl><form onsubmit={(event) => { event.preventDefault(); run({ type: 'verify', reportId: report.id, revision: formRevision, note, observationId: 'obs-a', value: workingValue }, '核对记录已保存；变更的指标需重新检查，关联预警已重新核实。'); }}><label>检测项目 A 当前结果<input bind:value={workingValue} aria-label="核对指标结果" required /></label><label>核对依据与修改原因<textarea bind:value={note} minlength="4" required placeholder="至少 4 个字符，说明核对范围与依据；请勿填写真实健康信息。"></textarea></label><div class="office-actions"><Button type="submit" disabled={report.quality === 'blocked'}>保存并确认核对</Button><Button type="button" variant="outline" onclick={loadForms}>放弃未保存修改</Button>{#if dirty}<span class="office-muted">尚未保存</span>{/if}</div></form></section><aside class="office-panel"><SectionHeader title="检查失败时人工接管" description="分别记录人工异常检查与人工校对，不自动判定正常。" /><p>{checkLabels[report.anomaly]} / {checkLabels[report.proof]}</p><p class="office-muted">使用左侧填写的依据。必须先完成数据核对；校对仍有待办建议时不能跳过。</p><div class="office-stack"><Button variant="outline" disabled={contentDirty} onclick={() => manual('anomaly')}>记录人工异常检查完成</Button><Button variant="outline" disabled={contentDirty} onclick={() => manual('proof')}>记录人工校对完成</Button></div></aside></div>
        {:else}
          <div class="office-panel-heading"><SectionHeader title="校对工作页" description="人工采纳至审核稿；原始文本保留。" /><label>选择报告<select aria-label="选择校对报告" value={report.id} onchange={(event) => navigate('proofreading', event.currentTarget.value)}>{#each reports as item (item.id)}<option value={item.id}>{item.id} · {item.person}</option>{/each}</select></label></div>
          <div class="office-grid"><section class="office-panel"><div class="office-panel-heading"><h3>审核工作稿 <small>文本 V{report.textVersion}</small></h3><StatusBadge status={stateTone(report.proof)} label={checkLabels[report.proof]} /></div><form onsubmit={(event) => { event.preventDefault(); run({ type: 'draft', reportId: report.id, revision: formRevision, text: workingText, note }, '已保存新的审核稿，旧建议失效，需重新校对。'); }}><label>工作稿内容<textarea class="office-editor" aria-label="审核工作稿" bind:value={workingText} required></textarea></label><label>修改 / 忽略 / 人工检查依据<textarea aria-label="校对处理依据" bind:value={note} placeholder="至少 4 个字符，说明处理依据。"></textarea></label><div class="office-actions"><Button type="submit" disabled={!contentDirty}>保存审核稿</Button><Button type="button" variant="outline" onclick={loadForms}>撤销未保存修改</Button></div></form>{#if contentDirty}<p class="office-blocker">有未保存修改。请先保存或撤销，再操作服务建议。</p>{/if}<div class="office-note">系统审核稿不等于机构正式更正报告。当前内容不会回写来源系统。</div></section><aside class="office-panel"><SectionHeader title="建议与检查" description="每条建议都绑定文本版本和原文位置。" />{#each suggestions as item (item.id)}<article class="office-suggestion"><div class="office-panel-heading"><strong>{item.category}</strong><StatusBadge status={item.state === 'pending' ? 'warning' : 'neutral'} label={suggestionLabels[item.state]} /></div><p><del>{item.original}</del><span aria-hidden="true"> → </span><ins>{item.replacement}</ins></p><small>文本 V{item.textVersion} · 区间 [{item.start}, {item.end}) · 固定合成建议</small><div class="office-actions"><Button size="sm" disabled={contentDirty || item.state !== 'pending'} onclick={() => run({ type: 'suggestion', suggestionId: item.id, revision: formRevision, decision: 'accepted', note }, '已采纳到审核工作稿；原始文本未修改，其他旧建议失效。')}>采纳</Button><Button size="sm" variant="outline" disabled={contentDirty || item.state !== 'pending'} onclick={() => run({ type: 'suggestion', suggestionId: item.id, revision: formRevision, decision: 'ignored', note }, '仅忽略本条建议，未加入全局白名单。')}>忽略本条</Button><Button size="sm" variant="outline" disabled={contentDirty} onclick={() => run({ type: 'whitelist', suggestionId: item.id, note }, '已提交限定范围白名单申请，尚未生效。')}>申请白名单</Button></div></article>{/each}{#if !suggestions.length}<div class="office-empty"><p>没有当前建议。检查失败或未执行时，不能据此判定文本无误。</p></div>{/if}<Button variant="outline" disabled={contentDirty} onclick={() => manual('proof')}>记录人工校对完成</Button></aside></div>
        {/if}
      {/if}
    {:else if view === 'alerts'}
      <section class="office-panel"><div class="office-panel-heading"><SectionHeader title="预警中心" description="记录领取、处置、证据和独立复核。" /><label>预警等级<select aria-label="预警等级" bind:value={levelFilter}><option value="all">全部等级</option><option value="1">一级 · 危急</option><option value="2">二级 · 异常</option><option value="3">三级 · 提示</option></select></label></div><div class="office-note">等级是固定合成输入，不是医学判断。一级预警不能批量忽略；处置完成和消息已读分别记录。</div><div class="office-table-wrap"><table><thead><tr><th>等级 / 任务</th><th>报告</th><th>责任人</th><th>状态</th><th>演示到期时间</th><th>操作</th></tr></thead><tbody>{#each filteredAlerts as item (item.id)}<tr><td><span class="office-level" class:critical={item.level === 1}>{item.level === 1 ? '一级 · 危急' : item.level === 2 ? '二级 · 异常' : '三级 · 提示'}</span><strong>{item.title}</strong></td><td>{item.reportId}</td><td>{item.owner === 'queue' ? '部门待分配队列' : item.owner}</td><td><StatusBadge status={stateTone(item.state)} label={alertLabels[item.state]} /></td><td>{formatTime(item.dueAt)}</td><td><Button size="sm" variant="outline" onclick={() => navigate('alert', item.reportId, item.id)}>打开任务</Button></td></tr>{/each}</tbody></table></div>{#if !filteredAlerts.length}<div class="office-empty"><h3>当前筛选没有预警</h3><p>可以切换等级查看其他授权任务。</p></div>{/if}</section>
    {:else if view === 'alert'}
      {#if !alert}<section class="office-empty"><h2>预警不存在或不在授权范围内</h2><Button onclick={() => navigate('alerts')}>返回预警中心</Button></section>{:else}
        <section class="office-report-header"><div><p class="office-eyebrow">{alert.id} / V{alert.revision}</p><h2>{alert.title}</h2><p>{alert.reportId} · 责任人：{alert.owner === 'queue' ? '部门队列' : alert.owner}</p></div><StatusBadge status={stateTone(alert.state)} label={alertLabels[alert.state]} /></section><div class="office-grid"><section class="office-panel"><SectionHeader title="处置操作" description="先确认接手，再填写结论与依据。" /><div class="office-note">消息已读不改变此状态。误报和转诊必须提供核实或交接证据；一级预警必须由不同人员复核。</div>
          {#if alert.state === 'waiting'}<Button onclick={() => run({ type: 'ack', alertId: alert.id, revision: alertRevision }, '已领取并确认预警，尚未处置或关闭。')}>领取并确认任务</Button>
          {:else if alert.state === 'processing'}<form onsubmit={(event) => { event.preventDefault(); run({ type: 'propose', alertId: alert.id, revision: alertRevision, result: disposition, note, evidence }, '处置已记录；一级预警或误报、转诊结论进入独立复核。'); }}><label>处置结论<select aria-label="处置结论" bind:value={disposition}><option value="handled">已处理</option><option value="false_positive">核实为误报</option><option value="referral">已完成交接</option></select></label><label>处理意见<textarea aria-label="处理意见" bind:value={note} required minlength="4"></textarea></label><label>核实依据 / 接收方交接确认<textarea aria-label="交接证据" bind:value={evidence} required={disposition !== 'handled'} placeholder="演示凭证编号或交接说明；转诊通知本身不代表完成交接。"></textarea></label><Button type="submit" disabled={alert.owner !== actor.id}>提交处置</Button></form>
          {:else if alert.state === 'review'}<div class="office-note">待独立复核。提交人：{alert.proposedBy}。请切换为不同的演示业务复核员。</div><label>复核意见<textarea aria-label="复核意见" bind:value={note}></textarea></label><Button disabled={!can(actor, 'review') || alert.proposedBy === actor.id} onclick={() => run({ type: 'approve', alertId: alert.id, revision: alertRevision, note }, '独立复核已通过，预警已关闭并保留证据。')}>复核通过并关闭</Button>
          {:else}<div class="office-empty"><h3>该预警已关闭</h3><p>关闭不删除历史证据。后续指标变化会重新打开受影响任务。</p><Button variant="outline" onclick={() => navigate('report', alert.reportId)}>返回报告继续审核</Button></div>{/if}
        </section><aside class="office-panel"><SectionHeader title="依据与处理记录" description="仅呈现输入结果，不生成医学结论。" /><dl class="office-facts"><div><dt>结果来源</dt><dd>固定合成数据 / fixture-v1</dd></div><div><dt>演示到期时间</dt><dd>{formatTime(alert.dueAt)} · 上海时区</dd></div><div><dt>处置意见</dt><dd>{alert.note || '尚未提交'}</dd></div><div><dt>交接 / 核实证据</dt><dd>{alert.evidence || '尚未提供'}</dd></div></dl><div class="office-timeline">{#each data.changes.filter((item) => item.kind === 'alert' && item.object === alert.id) as item (item.id)}<article><strong>{item.actor} · {formatTime(item.time)}</strong><p>{item.reason}</p>{#if 'state' in item.after}<small>状态：{item.after.state}</small>{/if}</article>{/each}</div><Button variant="outline" onclick={() => navigate('alerts')}>返回预警中心</Button></aside></div>
      {/if}
    {:else if view === 'analytics'}
      <section class="office-metrics"><MetricBlock label="报告快照" value={String(metrics.reports)} detail="不是时间段处理量" /><MetricBlock label="已完成报告" value={String(metrics.complete)} detail="按当前有效报告计数" /><MetricBlock label="演示观测异常率" value={metrics.rate} detail={`${metrics.abnormal} / ${metrics.denominator} 个可判定观测`} /><MetricBlock label="排除观测" value={String(metrics.excluded)} detail="缺失、未判定、失败或过期" /></section><section class="office-panel"><SectionHeader title="口径与可追溯明细" description="当前展示授权范围的合成快照，不伪造历史趋势或工作效率提升。" /><div class="office-note">异常率分母只含检查成功或有人工记录、且结果可判定的有效观测；无法判定单独展示。固定样例中的异常率不具有医学意义。</div><div class="office-table-wrap"><table><thead><tr><th>报告</th><th>检查状态</th><th>审核状态</th><th>查看明细</th></tr></thead><tbody>{#each reports as item (item.id)}<tr><td>{item.id}</td><td>{checkLabels[item.anomaly]}</td><td>{reportLabels[item.status]}</td><td><Button size="sm" variant="outline" onclick={() => navigate('report', item.id)}>钻取报告</Button></td></tr>{/each}</tbody></table></div><div class="office-actions"><Button variant="outline" disabled>Excel / PDF 导出（未接入）</Button><Button variant="outline" disabled>定时报表（未接入）</Button></div><p class="office-muted">生产版本需冻结统计窗口、时区、去重口径和受控下载权限；当前不提供公开下载地址。</p></section>
    {:else if view === 'rules'}
      <section class="office-panel"><SectionHeader title="规则审批流程演示" description="不配置生产医学阈值，不执行组合判定。" /><div class="office-note">规则内容编辑器、医学完整性校验、试运行、回滚与真实发布服务尚未接入。以下仅演示职责分离和状态迁移；演示发布不会生效或改写历史报告。</div><label>提交 / 复核说明<textarea bind:value={note} aria-label="规则处理说明" placeholder="至少 4 个字符。"></textarea></label>{#each data.rules as item (item.id)}<article class="office-rule"><div><strong>{item.title}</strong><p>{item.id} · 流程版本 {item.version} · {item.scope}</p><small>编辑者：{item.author} / 复核者：{item.reviewer ?? '尚未复核'}</small><p>{item.note}</p></div><div class="office-stack"><StatusBadge status={stateTone(item.state)} label={ruleLabels[item.state]} />{#if item.state === 'draft'}<Button size="sm" disabled={item.author !== actor.id} onclick={() => run({ type: 'rule', ruleId: item.id, version: item.version, action: 'submit', note }, '演示草稿已提交，需不同人员复核。')}>提交草稿</Button>{:else if item.state === 'review'}<Button size="sm" disabled={!can(actor, 'publish') || item.author === actor.id} onclick={() => run({ type: 'rule', ruleId: item.id, version: item.version, action: 'approve', note }, '独立复核流程已通过；未运行医学规则。')}>独立复核</Button>{:else if item.state === 'approved'}<Button size="sm" disabled={!can(actor, 'publish')} onclick={() => run({ type: 'rule', ruleId: item.id, version: item.version, action: 'publish', note }, '演示发布状态已记录；没有真实规则生效。')}>演示发布状态</Button>{/if}</div></article>{/each}</section><section class="office-panel"><SectionHeader title="白名单申请" description="忽略单条建议不产生全局白名单。" />{#each data.dictionary as item (item.id)}<div class="office-task"><div class="office-task-text"><strong>{item.term}</strong><p>{item.scope} · 提交人：{item.requester}</p></div><StatusBadge status="warning" label="申请中 · 未生效" /></div>{/each}{#if !data.dictionary.length}<div class="office-empty"><p>暂无申请。工作人员可以从校对页发起。</p></div>{/if}<p class="office-muted">词库 CRUD、白名单审批与词典版本分发需真实后端；本轮未将其标记为已完成。</p></section>
    {:else if view === 'messages'}
      <section class="office-panel"><SectionHeader title="站内消息" description="已读状态按演示身份记录，与业务任务确认分离。" />{#each messages as item (item.id)}<article class="office-task"><div class="office-task-text"><strong>{item.title}</strong><p>{item.id} · {item.reportId}</p><small>{item.readBy.includes(actor.id) ? '当前身份已读' : '当前身份未读'}</small></div><div class="office-actions"><Button size="sm" variant="outline" disabled={item.readBy.includes(actor.id)} onclick={() => run({ type: 'read-message', messageId: item.id }, '消息已读，关联预警仍需单独确认和处置。')}>标为已读</Button><Button size="sm" onclick={() => navigate('report', item.reportId)}>打开报告</Button></div></article>{/each}{#if !messages.length}<div class="office-empty"><p>当前授权范围没有消息。</p></div>{/if}<div class="office-note">邮件、短信与超时通知未接入。站内演示不代表通知已送达。</div></section>
    {:else if view === 'users'}
      <section class="office-panel"><SectionHeader title="用户与任务移交" description="停用人员前处理未完成任务，不删除其历史记录。" /><div class="office-note">本页仅演示两名业务人员的停用与任务移交，不修改 svadmin 登录账号。用户创建、角色授权及服务器会话失效仍需后端实施。</div><label class="office-checkbox"><input type="checkbox" bind:checked={transfer} />确认停用时将未完成报告、预警转移至原部门队列</label><div class="office-table-wrap"><table><thead><tr><th>演示账号</th><th>状态</th><th>操作</th></tr></thead><tbody>{#each data.staff as item (item.id)}<tr><td>{item.name}<small>{item.id}</small></td><td>{item.active ? '启用' : '已停用'}</td><td><Button variant="outline" size="sm" disabled={!item.active} onclick={() => { if (window.confirm(`停用 ${item.name}？未完成任务须按部门移交，历史记录保留。`)) run({ type: 'disable-user', userId: item.id, transfer }, '演示账号已停用，未完成任务已移交，历史记录保留。'); }}>停用演示账号</Button></td></tr>{/each}</tbody></table></div></section><section class="office-panel"><SectionHeader title="职责分离" description="页面授权只是交互示例，不是安全边界。" /><div class="office-table-wrap"><table><thead><tr><th>身份</th><th>能力包</th><th>数据范围</th></tr></thead><tbody>{#each actors as item (item.id)}<tr><td>{item.name}</td><td>{item.permissions.join(' / ')}</td><td>north</td></tr>{/each}</tbody></table></div></section>
    {:else if view === 'audit'}
      <section class="office-panel"><SectionHeader title="本会话操作记录" description="只读展示；不是持久化、防篡改的生产审计系统。" /><div class="office-note">运行记录不包含完整报告正文，业务修改快照在报告历史中查看。刷新会清空本会话；生产须由后端追加记录并实施保留策略。</div><div class="office-table-wrap"><table><thead><tr><th>时间（上海）</th><th>操作人</th><th>动作</th><th>对象</th></tr></thead><tbody>{#each data.audit.filter((item) => actor.departments.includes(item.department)).reverse() as item (item.id)}<tr><td>{formatTime(item.time)}</td><td>{item.actor}</td><td>{item.action}</td><td>{item.object}</td></tr>{/each}</tbody></table></div></section>
    {:else if view === 'integrations'}
      <section class="office-panel"><SectionHeader title="能力与接入状态" description="接口预留不等于集成完成。没有服务时不提供虚假的成功按钮。" /><div class="office-capabilities">{#each [{ title: '报告接入 / OCR', detail: '仅本地文件元数据预检。实际上传、扫描、结构化和原文定位未接入。' }, { title: '异常判定 / 文本校对', detail: '固定合成结果与人工接管流程。没有医学判断或纠错算法。' }, { title: '医保 / HIS / HL7 / FHIR', detail: '来源清单、接口版本、授权和字段映射待确认；未进行真实联调。' }, { title: '通知与受控导出', detail: '邮件、短信、定时报表、审批下载与撤销尚未接入。' }] as capability (capability.title)}<article><StatusBadge status="neutral" label="未接入" /><h3>{capability.title}</h3><p>{capability.detail}</p></article>{/each}</div><div class="office-note">疾病预测为二期预留，当前关闭；不会上传模型、训练或调用公网 AI。</div></section><section class="office-panel"><SectionHeader title="后端命令接入约束" description="为联调保留必要的身份、版本与失败边界。" /><dl class="office-facts"><div><dt>请求上下文</dt><dd>服务端会话、数据范围、对象标识、expectedRevision、idempotencyKey、requestId。</dd></div><div><dt>冲突与失败</dt><dd>403 无权访问；409 版本冲突；422 业务门禁；503 能力不可用。失败不返回“正常”。</dd></div><div><dt>异步回调</dt><dd>校验来源和报告 / 文本版本；重复回调只应用一次；过期结果不覆盖新结果。</dd></div><div><dt>上线门槛</dt><dd>真实授权、持久化、审计、通知、导出与恢复测试；不能以本页演示替代。</dd></div></dl></section>
    {/if}
    <footer class="office-footer"><span>智能辅助办公 · PRD V1.1 页面与流程验证</span><span>不提供自动诊断 · 不处理真实健康资料</span></footer>
  </div>
</ContentPageShell>
