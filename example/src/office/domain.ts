/** 合成数据工作区。此模块不是服务端授权层，也不执行医学判断或文字识别。 */
export type OfficeView = 'dashboard' | 'reports' | 'imports' | 'report' | 'verification' | 'alerts' | 'alert' | 'proofreading' | 'analytics' | 'rules' | 'messages' | 'users' | 'audit' | 'integrations';
export type Permission = 'read' | 'verify' | 'handle' | 'review' | 'proof' | 'original' | 'rules' | 'publish' | 'users' | 'audit';
export interface Actor { id: string; name: string; permissions: Permission[]; departments: string[] }
export const actors: Actor[] = [
  { id: 'worker', name: '演示审核员', permissions: ['read', 'verify', 'handle', 'proof'], departments: ['north'] },
  { id: 'reviewer', name: '演示业务复核员', permissions: ['read', 'verify', 'handle', 'review', 'proof', 'original', 'rules', 'publish'], departments: ['north'] },
  { id: 'admin', name: '演示配置管理员', permissions: ['rules', 'users'], departments: ['north'] },
  { id: 'auditor', name: '演示审计员', permissions: ['audit'], departments: ['north'] },
];
export const views: { id: OfficeView; label: string; page: string; permission: Permission | null; detail?: boolean }[] = [
  { id: 'dashboard', label: '工作台', page: 'UI-01', permission: 'read' },
  { id: 'reports', label: '报告中心', page: 'UI-02', permission: 'read' },
  { id: 'imports', label: '导入任务', page: 'UI-03', permission: 'verify' },
  { id: 'report', label: '报告详情', page: 'UI-04', permission: 'read', detail: true },
  { id: 'verification', label: '数据核对', page: 'UI-05', permission: 'verify', detail: true },
  { id: 'alerts', label: '预警中心', page: 'UI-06', permission: 'read' },
  { id: 'alert', label: '预警处置', page: 'UI-07', permission: 'handle', detail: true },
  { id: 'proofreading', label: '文档校对', page: 'UI-08', permission: 'proof' },
  { id: 'analytics', label: '统计报表', page: 'UI-09', permission: 'read' },
  { id: 'rules', label: '规则与词典', page: 'UI-10', permission: 'rules' },
  { id: 'messages', label: '消息中心', page: 'UI-11', permission: 'read' },
  { id: 'users', label: '用户与权限', page: 'UI-12', permission: 'users' },
  { id: 'audit', label: '审计与运行', page: 'UI-13', permission: 'audit' },
  { id: 'integrations', label: '集成与配置', page: 'UI-14', permission: 'rules' },
];
export type CheckState = 'success' | 'manual' | 'failed' | 'not_run' | 'stale';
export type ReportStatus = 'pending' | 'in_review' | 'complete';
export interface Observation { id: string; name: string; original: string; value: string; unit: string; reference: string; verdict: 'abnormal' | 'normal' | 'unknown'; page: number | null }
export interface Report {
  id: string; person: string; maskedIdentity: string; department: string; institution: string; date: string;
  revision: number; textVersion: number; status: ReportStatus; quality: 'pending' | 'verified' | 'blocked';
  anomaly: CheckState; proof: CheckState; owner: string; originalText: string; draft: string; observations: Observation[];
}
export interface AlertTask {
  id: string; reportId: string; department: string; revision: number; level: 1 | 2 | 3;
  title: string; state: 'waiting' | 'processing' | 'review' | 'closed'; owner: string;
  dueAt: string; result: 'handled' | 'false_positive' | 'referral' | null; note: string; evidence: string; proposedBy: string | null;
}
export interface Suggestion { id: string; reportId: string; textVersion: number; original: string; replacement: string; start: number; end: number; state: 'pending' | 'accepted' | 'ignored' | 'stale'; category: string }
export interface Rule { id: string; title: string; version: number; state: 'draft' | 'review' | 'approved' | 'published'; author: string; reviewer: string | null; scope: string; note: string }
export interface AuditEntry { id: string; actor: string; department: string; action: string; object: string; time: string }
export interface ImportJob { id: string; filename: string; size: number; state: 'blocked' | 'rejected' | 'cancelled'; reason: string }
export interface ChangeEntry { id: string; kind: 'report' | 'alert' | 'rule'; object: string; department: string; actor: string; time: string; reason: string; before: Report | AlertTask | Rule; after: Report | AlertTask | Rule }
export interface OfficeData {
  reports: Report[]; alerts: AlertTask[]; suggestions: Suggestion[]; rules: Rule[];
  dictionary: { id: string; term: string; scope: string; state: 'requested'; requester: string }[];
  messages: { id: string; reportId: string; title: string; readBy: string[] }[];
  staff: { id: string; name: string; active: boolean }[]; imports: ImportJob[]; audit: AuditEntry[]; changes: ChangeEntry[];
}
export class OfficeError extends Error { constructor(message: string) { super(message); this.name = 'OfficeError'; } }
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new OfficeError(message); }
export function can(actor: Actor, permission: Permission): boolean { return actor.permissions.includes(permission); }
export function canView(actor: Actor, view: OfficeView): boolean { const item = views.find((entry) => entry.id === view); return !!item && (item.permission === null || can(actor, item.permission)); }
export function visibleReports(data: OfficeData, actor: Actor): Report[] { return can(actor, 'read') && !data.staff.some((item) => item.id === actor.id && !item.active) ? data.reports.filter((item) => actor.departments.includes(item.department)) : []; }
export function visibleAlerts(data: OfficeData, actor: Actor): AlertTask[] { const ids = new Set(visibleReports(data, actor).map((item) => item.id)); return data.alerts.filter((item) => ids.has(item.reportId)); }
export function reportById(data: OfficeData, actor: Actor, id: string): Report | undefined { return visibleReports(data, actor).find((item) => item.id === id); }
export function isView(value: string | null): value is OfficeView { return views.some((item) => item.id === value); }
export function completionBlockers(data: OfficeData, report: Report): string[] {
  const blockers: string[] = [];
  if (report.quality !== 'verified') blockers.push('身份与关键指标尚未完成核对');
  if (!['success', 'manual'].includes(report.anomaly)) blockers.push('异常检查未完成，需重试或人工接管');
  if (!['success', 'manual'].includes(report.proof)) blockers.push('文档校对未完成，需检查或人工接管');
  if (data.alerts.some((item) => item.reportId === report.id && item.state !== 'closed')) blockers.push('仍有未关闭或待复核的预警');
  if (data.suggestions.some((item) => item.reportId === report.id && item.state === 'pending')) blockers.push('仍有待处理的校对建议');
  return blockers;
}
export function officeMetrics(data: OfficeData, actor: Actor) {
  const reports = visibleReports(data, actor); const alerts = visibleAlerts(data, actor);
  const observations = reports.flatMap((item) => item.observations);
  const eligible = reports.filter((item) => ['success', 'manual'].includes(item.anomaly)).flatMap((item) => item.observations).filter((item) => item.verdict !== 'unknown');
  const abnormal = eligible.filter((item) => item.verdict === 'abnormal').length;
  return { reports: reports.length, complete: reports.filter((item) => item.status === 'complete').length, critical: alerts.filter((item) => item.level === 1 && item.state !== 'closed').length, open: alerts.filter((item) => item.state !== 'closed').length, verify: reports.filter((item) => item.quality !== 'verified').length, abnormal, denominator: eligible.length, excluded: observations.length - eligible.length, rate: eligible.length ? `${(100 * abnormal / eligible.length).toFixed(1)}%` : '—' };
}
export const checkLabels: Record<CheckState, string> = { success: '已返回演示结果', manual: '人工检查完成', failed: '服务失败', not_run: '尚未检查', stale: '数据已变更，需重查' };
export const reportLabels: Record<ReportStatus, string> = { pending: '待审核', in_review: '审核中', complete: '已完成' };
export const alertLabels: Record<AlertTask['state'], string> = { waiting: '待确认', processing: '处理中', review: '待复核', closed: '已关闭' };
export function createOfficeData(now = '2026-09-19T08:00:00.000Z'): OfficeData {
  const texts = ['检查所见：本报告仅为合成样例。请核对检杳结果。', '检查所见：此处展示能力不可用后的人工检查流程。', '备注：此报告已完成审核，可演示修改后的重开。', '备注：身份信息有冲突，必须先核对来源。', '其他部门的合成记录，不应进入当前人员的列表或统计。'];
  const reports: Report[] = texts.map((text, index) => ({
    id: `DEMO-R00${index + 1}`, person: `合成人员 ${String(index + 1).padStart(3, '0')}`, maskedIdentity: `DEMO-****-00${index + 1}`,
    department: index === 4 ? 'south' : 'north', institution: index === 4 ? '演示机构·南区' : '演示机构·北区', date: '2026-09-19', revision: 1, textVersion: 1,
    status: index === 2 ? 'complete' : 'pending', quality: index === 3 ? 'blocked' : index === 0 ? 'pending' : 'verified',
    anomaly: index === 1 ? 'failed' : index === 3 ? 'not_run' : 'success', proof: index === 1 ? 'failed' : index === 3 ? 'not_run' : 'success', owner: index === 4 ? 'south-worker' : 'worker', originalText: text, draft: text,
    observations: [
      { id: 'obs-a', name: '检测项目 A（合成）', original: '18.2', value: '18.2', unit: '来源单位', reference: '按批准的机构范围；演示不作医学判定', verdict: index === 0 ? 'abnormal' : index === 3 ? 'unknown' : 'normal', page: 1 },
      { id: 'obs-b', name: '检测项目 B（合成）', original: '未提供', value: '未提供', unit: '缺失', reference: '来源未提供', verdict: 'unknown', page: null },
    ],
  }));
  const first = texts[0] ?? ''; const start = first.indexOf('检杳');
  return {
    reports, alerts: [
      { id: 'DEMO-A001', reportId: 'DEMO-R001', department: 'north', revision: 1, level: 1, title: '疑似危急 · 待核实的演示结果', state: 'waiting', owner: 'queue', dueAt: new Date(new Date(now).getTime() - 600000).toISOString(), result: null, note: '', evidence: '', proposedBy: null },
      { id: 'DEMO-A002', reportId: 'DEMO-R002', department: 'north', revision: 1, level: 2, title: '需要跟进的演示异常', state: 'waiting', owner: 'worker', dueAt: new Date(new Date(now).getTime() + 3600000).toISOString(), result: null, note: '', evidence: '', proposedBy: null },
      { id: 'DEMO-A003', reportId: 'DEMO-R005', department: 'south', revision: 1, level: 1, title: '其他部门合成预警', state: 'waiting', owner: 'queue', dueAt: now, result: null, note: '', evidence: '', proposedBy: null },
    ],
    suggestions: [{ id: 'DEMO-S001', reportId: 'DEMO-R001', textVersion: 1, original: '检杳', replacement: '检查', start, end: start + 2, state: 'pending', category: '疑似错别字' }],
    rules: [{ id: 'DEMO-RULE001', title: '组合规则配置样例（不执行医学判断）', version: 1, state: 'draft', author: 'admin', reviewer: null, scope: '演示机构·北区', note: '阈值和适用人群须由授权业务方提供；当前为空。' }],
    dictionary: [], changes: [], messages: [{ id: 'DEMO-M001', reportId: 'DEMO-R001', title: '您有一项一级预警待确认', readBy: [] }, { id: 'DEMO-M002', reportId: 'DEMO-R002', title: '检查任务失败，请进入人工接管流程', readBy: [] }],
    staff: [{ id: 'worker', name: '演示审核员', active: true }, { id: 'reviewer', name: '演示业务复核员', active: true }], imports: [],
    audit: [{ id: 'EV-1', actor: 'system-demo', department: 'north', action: '载入合成演示数据；无真实服务调用', object: 'demo-session', time: now }],
  };
}
export type OfficeCommand =
  | { type: 'verify'; reportId: string; revision: number; note: string; observationId?: string; value?: string }
  | { type: 'manual'; reportId: string; revision: number; check: 'anomaly' | 'proof'; note: string }
  | { type: 'complete'; reportId: string; revision: number }
  | { type: 'ack'; alertId: string; revision: number }
  | { type: 'propose'; alertId: string; revision: number; result: NonNullable<AlertTask['result']>; note: string; evidence: string }
  | { type: 'approve'; alertId: string; revision: number; note: string }
  | { type: 'reject'; alertId: string; revision: number; note: string }
  | { type: 'suggestion'; suggestionId: string; revision: number; decision: 'accepted' | 'ignored'; note: string }
  | { type: 'draft'; reportId: string; revision: number; text: string; note: string }
  | { type: 'whitelist'; suggestionId: string; note: string }
  | { type: 'read-message'; messageId: string }
  | { type: 'rule'; ruleId: string; version: number; action: 'submit' | 'approve' | 'publish'; note: string }
  | { type: 'import'; files: { name: string; size: number }[] }
  | { type: 'cancel-import'; jobId: string }
  | { type: 'disable-user'; userId: string; transfer: boolean };
/** 浏览器内演示事务：先校验再返回新快照；真实后端必须重新授权并持久化审计。 */
export function executeOfficeCommand(input: OfficeData, actor: Actor, command: OfficeCommand, now = new Date().toISOString()): OfficeData {
  const data = structuredClone(input);
  ensure(!data.staff.some((item) => item.id === actor.id && !item.active), '当前演示账号已停用');
  const permission = (value: Permission) => ensure(can(actor, value), '当前演示身份没有此操作权限');
  const reason = (value: string) => ensure(value.trim().length >= 4, '请填写至少 4 个字符的处理依据或原因');
  const log = (action: string, object: string, department = 'north') => data.audit.push({ id: `EV-${data.audit.length + 1}`, actor: actor.id, department, action, object, time: now });
  const getReport = (id: string, revision: number) => {
    const report = reportById(data, actor, id); ensure(report, '报告不存在或不在授权范围内');
    ensure(report.revision === revision, '版本冲突：请重新加载当前记录后操作'); return report;
  };
  const getAlert = (id: string, revision: number) => {
    const alert = visibleAlerts(data, actor).find((item) => item.id === id); ensure(alert, '预警不存在或不在授权范围内');
    ensure(alert.revision === revision, '版本冲突：预警已被其他操作更新'); return alert;
  };
  const reopen = (report: Report) => { report.status = 'in_review'; report.revision += 1; };
  const invalidateText = (report: Report) => { report.textVersion += 1; report.proof = 'stale'; data.suggestions.filter((item) => item.reportId === report.id && item.state === 'pending').forEach((item) => { item.state = 'stale'; }); };
  switch (command.type) {
    case 'verify': {
      permission('verify'); reason(command.note); const report = getReport(command.reportId, command.revision);
      ensure(report.quality !== 'blocked', '身份冲突未解决：需真实来源核实，不能直接确认');
      if (command.observationId !== undefined) {
        const observation = report.observations.find((item) => item.id === command.observationId); ensure(observation, '指标不存在');
        ensure(command.value !== undefined && command.value.trim().length > 0, '指标结果不能为空');
        if (observation.value !== command.value) { observation.value = command.value; observation.verdict = 'unknown'; report.anomaly = 'stale';
          data.alerts.filter((item) => item.reportId === report.id).forEach((item) => { item.state = 'waiting'; item.result = null; item.proposedBy = null; item.revision += 1; });
        }
      }
      report.quality = 'verified'; reopen(report); log('人工核对派生数据；原始值保持不变', report.id, report.department); break;
    }
    case 'manual': {
      permission(command.check === 'proof' ? 'proof' : 'verify'); reason(command.note);
      const report = getReport(command.reportId, command.revision); ensure(report.quality === 'verified', '请先完成人员与关键指标核对');
      if (command.check === 'proof') ensure(!data.suggestions.some((item) => item.reportId === report.id && item.state === 'pending'), '请先处理当前待办建议，不得用人工完成跳过');
      report[command.check] = 'manual'; reopen(report); log(`记录人工${command.check === 'proof' ? '校对' : '异常检查'}完成；非自动检查结论`, report.id, report.department); break;
    }
    case 'complete': {
      permission('verify'); const report = getReport(command.reportId, command.revision);
      ensure(report.status !== 'complete', '报告已经完成，不能重复完成');
      const blockers = completionBlockers(data, report); ensure(!blockers.length, blockers.join('；'));
      report.status = 'complete'; report.revision += 1; log('完成报告审核', report.id, report.department); break;
    }
    case 'ack': {
      permission('handle'); const alert = getAlert(command.alertId, command.revision);
      ensure(alert.state === 'waiting', '此预警已确认，不能重复领取');
      ensure(alert.owner === 'queue' || alert.owner === actor.id || can(actor, 'review'), '该任务已有其他负责人');
      alert.owner = actor.id; alert.state = 'processing'; alert.revision += 1; log('领取并确认预警；尚未关闭', alert.id, alert.department); break;
    }
    case 'propose': {
      permission('handle'); reason(command.note); const alert = getAlert(command.alertId, command.revision);
      ensure(alert.state === 'processing' && alert.owner === actor.id, '只能处理本人已确认的任务');
      ensure(['handled', 'false_positive', 'referral'].includes(command.result), '未知的处置结果');
      if (command.result !== 'handled') reason(command.evidence);
      alert.result = command.result; alert.note = command.note; alert.evidence = command.evidence; alert.proposedBy = actor.id;
      alert.state = alert.level === 1 || command.result !== 'handled' ? 'review' : 'closed'; alert.revision += 1;
      log(alert.state === 'review' ? '提交处置待独立复核' : '关闭普通预警并记录结论', alert.id, alert.department); break;
    }
    case 'approve': {
      permission('review'); reason(command.note); const alert = getAlert(command.alertId, command.revision);
      ensure(alert.state === 'review', '任务尚未提交复核'); ensure(alert.proposedBy !== actor.id, '不能复核自己提交的处置');
      ensure(alert.result !== null, '缺少处置结论'); if (alert.result !== 'handled') reason(alert.evidence);
      alert.state = 'closed'; alert.revision += 1; log('独立复核通过并关闭预警', alert.id, alert.department); break;
    }
    case 'reject': {
      permission('review'); reason(command.note); const alert = getAlert(command.alertId, command.revision);
      ensure(alert.state === 'review', '任务尚未提交复核');
      ensure(alert.proposedBy !== actor.id, '不能复核自己提交的处置');
      // 保留上次处置及证据；退回原因写入变更记录，交由原负责人重新提交。
      alert.state = 'processing'; alert.revision += 1;
      log(`独立复核退回：${command.note.trim()}`, alert.id, alert.department); break;
    }
    case 'suggestion': {
      permission('proof'); const suggestion = data.suggestions.find((item) => item.id === command.suggestionId); ensure(suggestion, '建议不存在');
      const report = getReport(suggestion.reportId, command.revision); ensure(suggestion.state === 'pending', '建议已处理或已失效');
      ensure(suggestion.textVersion === report.textVersion && report.draft.slice(suggestion.start, suggestion.end) === suggestion.original, '定位或文本版本已变化，禁止盲目替换');
      if (command.decision === 'ignored') reason(command.note);
      suggestion.state = command.decision;
      if (command.decision === 'accepted') { report.draft = report.draft.slice(0, suggestion.start) + suggestion.replacement + report.draft.slice(suggestion.end); invalidateText(report); }
      reopen(report); log(command.decision === 'accepted' ? '采纳建议至审核稿；其他旧建议失效' : '仅忽略当前建议；未加入白名单', suggestion.id, report.department); break;
    }
    case 'draft': {
      permission('proof'); reason(command.note); const report = getReport(command.reportId, command.revision);
      ensure(command.text.trim().length > 0, '审核稿不能为空'); ensure(command.text !== report.draft, '内容未变化');
      report.draft = command.text; invalidateText(report); reopen(report); log('保存新审核稿版本，重开受影响检查', report.id, report.department); break;
    }
    case 'whitelist': {
      permission('proof'); reason(command.note); const suggestion = data.suggestions.find((item) => item.id === command.suggestionId); ensure(suggestion, '建议不存在');
      ensure(reportById(data, actor, suggestion.reportId), '报告不存在或不在授权范围内');
      ensure(!data.dictionary.some((item) => item.term === suggestion.original && item.requester === actor.id), '相同词条申请已存在');
      data.dictionary.push({ id: `DICT-${data.dictionary.length + 1}`, term: suggestion.original, scope: '演示机构·北区', state: 'requested', requester: actor.id });
      log('提交限定范围白名单申请；尚未生效', suggestion.id); break;
    }
    case 'read-message': {
      permission('read'); const message = data.messages.find((item) => item.id === command.messageId); ensure(message && reportById(data, actor, message.reportId), '消息不存在或无权访问');
      if (!message.readBy.includes(actor.id)) { message.readBy.push(actor.id); log('站内消息已读；未确认关联任务', message.id); } break;
    }
    case 'rule': {
      permission('rules'); reason(command.note); const rule = data.rules.find((item) => item.id === command.ruleId); ensure(rule, '规则不存在');
      ensure(rule.version === command.version, '规则版本冲突');
      ensure(actor.departments.includes('north'), '规则不在授权范围内');
      ensure(['submit', 'approve', 'publish'].includes(command.action), '未知的规则动作');
      if (command.action === 'submit') { ensure(rule.state === 'draft' && rule.author === actor.id, '只能提交本人草稿'); rule.state = 'review'; }
      if (command.action === 'approve') { permission('publish'); ensure(rule.state === 'review', '规则未提交复核'); ensure(rule.author !== actor.id, '规则编辑者不能自审'); rule.state = 'approved'; rule.reviewer = actor.id; }
      if (command.action === 'publish') { permission('publish'); ensure(rule.state === 'approved' && rule.reviewer !== null && rule.reviewer !== rule.author, '请先完成独立审批'); rule.state = 'published'; }
      rule.version += 1; rule.note = command.note; log(`演示规则${command.action}；不启用医学判定或改写历史报告`, rule.id); break;
    }
    case 'import': {
      permission('verify'); ensure(command.files.length > 0 && command.files.length <= 100, '每批请选择 1 至 100 个文件');
      command.files.forEach((file) => {
        const supported = /\.(pdf|png|jpe?g|xlsx|docx)$/i.test(file.name); const valid = supported && Number.isFinite(file.size) && file.size > 0 && file.size <= 50 * 1024 * 1024;
        data.imports.push({ id: `IMP-${data.imports.length + 1}`, filename: file.name, size: file.size, state: valid ? 'blocked' : 'rejected', reason: !supported ? '暂不支持此扩展名' : !valid ? '文件为空或超过建议的 50 MB 限制' : '仅完成本地名称/大小检查；未上传，真实扫描和解析服务未接入' });
      }); log('建立本地导入预检清单；未读取或上传文件内容', 'import-preview'); break;
    }
    case 'cancel-import': {
      permission('verify'); const job = data.imports.find((item) => item.id === command.jobId); ensure(job, '导入项不存在'); ensure(job.state === 'blocked', '仅能取消未开始的导入项'); job.state = 'cancelled'; log('取消未上传的导入预检项', job.id); break;
    }
    case 'disable-user': {
      permission('users'); ensure(actor.id !== command.userId, '不能停用当前操作身份'); const user = data.staff.find((item) => item.id === command.userId); ensure(user && user.active, '人员不存在或已停用');
      const alerts = data.alerts.filter((item) => item.owner === user.id && item.state !== 'closed');
      const reports = data.reports.filter((item) => item.owner === user.id && item.status !== 'complete');
      ensure(command.transfer || (!alerts.length && !reports.length), '存在未完成任务，请先确认转移到部门队列');
      ensure([...alerts, ...reports].every((item) => actor.departments.includes(item.department)), '存在其他部门任务，当前管理员不能停用该人员');
      alerts.forEach((item) => { item.owner = 'queue'; item.revision += 1; if (item.state === 'processing') item.state = 'waiting'; });
      reports.forEach((item) => { item.owner = 'queue'; item.revision += 1; }); user.active = false; log('转移未完成任务后停用演示账号；保留历史证据', user.id); break;
    }
  }
  // 业务变更快照独立于运行日志。仅用于本会话的合成数据追溯。
  const changeReason = 'note' in command ? command.note : command.type;
  const recordChanges = <T extends Report | AlertTask | Rule>(kind: ChangeEntry['kind'], previous: T[], current: T[]) => {
    for (const after of current) {
      const before = previous.find((item) => item.id === after.id);
      if (before && JSON.stringify(before) !== JSON.stringify(after)) {
        data.changes.push({ id: `CHANGE-${data.changes.length + 1}`, kind, object: after.id,
          department: 'department' in after ? after.department : 'north', actor: actor.id, time: now,
          reason: changeReason, before: structuredClone(before), after: structuredClone(after) });
      }
    }
  };
  recordChanges('report', input.reports, data.reports);
  recordChanges('alert', input.alerts, data.alerts);
  recordChanges('rule', input.rules, data.rules);
  return data;
}
