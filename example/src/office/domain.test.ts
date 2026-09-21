import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { actors, canView, completionBlockers, createOfficeData, executeOfficeCommand, officeMetrics, reportById, visibleAlerts, visibleReports, type OfficeCommand, type OfficeData } from './domain';

function required<T>(value: T | undefined): T {
  assert.notEqual(value, undefined, 'Expected synthetic fixture record to exist');
  if (value === undefined) throw new Error('Missing fixture record');
  return value;
}

const worker = required(actors[0]);
const reviewer = required(actors[1]);
const admin = required(actors[2]);
const auditor = required(actors[3]);
const R = 'DEMO-R001';
const A = 'DEMO-A001';
const note = '已依据合成原文人工核实';
const run = (data: OfficeData, command: OfficeCommand, actor = worker) => executeOfficeCommand(data, actor, command, '2026-09-19T08:10:00.000Z');
const fixture = () => createOfficeData();

function acknowledged(data = fixture()) { return run(data, { type: 'ack', alertId: A, revision: 1 }); }
function submitted(result: 'handled' | 'false_positive' | 'referral' = 'handled') {
  return run(acknowledged(), { type: 'propose', alertId: A, revision: 2, result, note, evidence: '合成交接凭证编号 DEMO-1' });
}

describe('授权范围与最小权限', () => {
  test('列表、预警、统计不含其他部门', () => {
    assert.equal(visibleReports(fixture(), worker).length, 4);
    assert.equal(visibleAlerts(fixture(), worker).length, 2);
    assert.equal(officeMetrics(fixture(), worker).reports, 4);
    assert.equal(reportById(fixture(), worker, 'DEMO-R005'), undefined);
  });
  test('配置管理员不自动获得报告数据权限', () => {
    assert.equal(visibleReports(fixture(), admin).length, 0);
    assert.equal(officeMetrics(fixture(), admin).denominator, 0);
    assert.equal(canView(admin, 'report'), false);
    assert.equal(canView(auditor, 'audit'), true);
  });
  test('直接提交越权对象操作也失败', () => {
    assert.throws(() => run(fixture(), { type: 'verify', reportId: 'DEMO-R005', revision: 1, note }), /授权范围/);
    assert.throws(() => run(fixture(), { type: 'ack', alertId: A, revision: 1 }, admin), /权限/);
  });
  test('原件权限与报告权限分离', () => {
    assert.equal(worker.permissions.includes('original'), false);
    assert.equal(reviewer.permissions.includes('original'), true);
  });
});

describe('预警状态与复核门禁', () => {
  test('消息已读幂等且不确认预警', () => {
    const data = run(fixture(), { type: 'read-message', messageId: 'DEMO-M001' });
    assert.equal(required(data.alerts[0]).state, 'waiting');
    assert.deepEqual(run(data, { type: 'read-message', messageId: 'DEMO-M001' }), data);
    assert.equal(required(data.messages[0]).readBy.includes(reviewer.id), false);
  });
  test('领取只进入处理中，重复领取被拒绝', () => {
    const data = acknowledged();
    assert.equal(required(data.alerts[0]).state, 'processing');
    assert.throws(() => run(data, { type: 'ack', alertId: A, revision: 2 }), /重复领取/);
  });
  test('一级预警不能直接关闭', () => {
    const data = submitted();
    assert.equal(required(data.alerts[0]).state, 'review');
    assert.throws(() => run(data, { type: 'approve', alertId: A, revision: 3, note }), /权限/);
    const approved = run(data, { type: 'approve', alertId: A, revision: 3, note }, reviewer);
    assert.equal(required(approved.alerts[0]).state, 'closed');
    assert.equal(approved.changes.filter((item) => item.object === A).length, 3);
  });
  test('有复核权限也不能自审自己的处置', () => {
    let data = run(fixture(), { type: 'ack', alertId: A, revision: 1 }, reviewer);
    data = run(data, { type: 'propose', alertId: A, revision: 2, result: 'handled', note, evidence: '' }, reviewer);
    assert.throws(() => run(data, { type: 'approve', alertId: A, revision: 3, note }, reviewer), /不能复核自己/);
  });
  test('误报和转诊必须提供证据', () => {
    for (const result of ['false_positive', 'referral'] as const) {
      assert.throws(() => run(acknowledged(), { type: 'propose', alertId: A, revision: 2, result, note, evidence: '' }), /依据或原因/);
      assert.equal(required(submitted(result).alerts[0]).state, 'review');
    }
  });
  test('普通已处理任务可闭环，仍保存处置说明', () => {
    let data = run(fixture(), { type: 'ack', alertId: 'DEMO-A002', revision: 1 });
    data = run(data, { type: 'propose', alertId: 'DEMO-A002', revision: 2, result: 'handled', note, evidence: '' });
    assert.equal(required(data.alerts[1]).state, 'closed');
    assert.equal(required(data.alerts[1]).note, note);
  });
  test('旧页面提交不覆盖新状态；失败事务不改变原对象', () => {
    const data = acknowledged(); const before = structuredClone(data);
    assert.throws(() => run(data, { type: 'propose', alertId: A, revision: 1, result: 'handled', note, evidence: '' }), /版本冲突/);
    assert.deepEqual(data, before);
  });
  test('独立复核可有依据地退回并由原负责人重新提交', () => {
    const before = submitted('referral');
    const data = run(before, { type: 'reject', alertId: A, revision: 3, note: '缺少接收方确认，请补充凭证' }, reviewer);
    assert.equal(required(data.alerts[0]).state, 'processing');
    assert.equal(required(data.alerts[0]).owner, worker.id);
    assert.equal(required(data.alerts[0]).evidence, required(before.alerts[0]).evidence);
    assert.ok(data.audit.some(item => item.action.includes('缺少接收方确认')));
    assert.equal(required(data.changes.at(-1)).reason, '缺少接收方确认，请补充凭证');
    assert.throws(() => run(before, { type: 'reject', alertId: A, revision: 3, note: '' }, reviewer), /依据或原因/);
    assert.throws(() => run(data, { type: 'approve', alertId: A, revision: 3, note }, reviewer), /版本冲突/);
    const resubmitted = run(data, { type: 'propose', alertId: A, revision: 4, result: 'referral', note, evidence: '已收到合成接收方确认' });
    assert.equal(required(resubmitted.alerts[0]).state, 'review');
  });
  test('退回同样要求独立权限、正确状态和部门范围', () => {
    assert.throws(() => run(submitted(), { type: 'reject', alertId: A, revision: 3, note }), /权限/);
    assert.throws(() => run(fixture(), { type: 'reject', alertId: A, revision: 1, note }, reviewer), /尚未提交/);
    assert.throws(() => run(fixture(), { type: 'reject', alertId: 'DEMO-A003', revision: 1, note }, reviewer), /授权范围/);
    let data = run(fixture(), { type: 'ack', alertId: A, revision: 1 }, reviewer);
    data = run(data, { type: 'propose', alertId: A, revision: 2, result: 'handled', note, evidence: '' }, reviewer);
    assert.throws(() => run(data, { type: 'reject', alertId: A, revision: 3, note }, reviewer), /不能复核自己/);
  });
});

describe('报告、原件及校对版本', () => {
  test('待核对、失败检查和未关闭预警阻止完成', () => {
    const data = fixture();
    assert.ok(completionBlockers(data, required(data.reports[0])).length >= 3);
    assert.throws(() => run(data, { type: 'complete', reportId: R, revision: 1 }), /核对/);
    assert.throws(() => run(data, { type: 'complete', reportId: 'DEMO-R002', revision: 1 }), /检查未完成/);
  });
  test('身份冲突不能被普通确认操作绕过', () => {
    assert.throws(() => run(fixture(), { type: 'verify', reportId: 'DEMO-R004', revision: 1, note }), /身份冲突/);
  });
  test('指标修正不覆盖原始值，重新检查并重开预警', () => {
    let data = submitted(); data = run(data, { type: 'approve', alertId: A, revision: 3, note }, reviewer);
    data = run(data, { type: 'verify', reportId: R, revision: 1, note, observationId: 'obs-a', value: '18.3' });
    assert.equal(required(required(data.reports[0]).observations[0]).original, '18.2');
    assert.equal(required(required(data.reports[0]).observations[0]).value, '18.3');
    assert.equal(required(data.reports[0]).anomaly, 'stale');
    assert.equal(required(data.alerts[0]).state, 'waiting');
    assert.ok(data.changes.some((item) => item.object === R && item.reason === note));
  });
  test('采纳建议仅修改审核稿，服务结果转为需重查', () => {
    const before = fixture();
    const data = run(before, { type: 'suggestion', suggestionId: 'DEMO-S001', revision: 1, decision: 'accepted', note: '' });
    assert.equal(required(data.reports[0]).originalText, required(before.reports[0]).originalText);
    assert.equal(required(data.reports[0]).draft.includes('检杳'), false);
    assert.equal(required(data.reports[0]).textVersion, 2);
    assert.equal(required(data.reports[0]).proof, 'stale');
    assert.equal(required(before.suggestions[0]).state, 'pending');
  });
  test('忽略不创建全局白名单，申请也不会自动生效', () => {
    let data = run(fixture(), { type: 'suggestion', suggestionId: 'DEMO-S001', revision: 1, decision: 'ignored', note });
    assert.equal(data.dictionary.length, 0);
    data = run(data, { type: 'whitelist', suggestionId: 'DEMO-S001', note });
    assert.equal(required(data.dictionary[0]).state, 'requested');
    assert.throws(() => run(data, { type: 'whitelist', suggestionId: 'DEMO-S001', note }), /已存在/);
  });
  test('定位失效和文本版本不匹配都禁止替换', () => {
    const data = fixture(); required(data.suggestions[0]).start = 0;
    assert.throws(() => run(data, { type: 'suggestion', suggestionId: 'DEMO-S001', revision: 1, decision: 'accepted', note: '' }), /禁止盲目替换/);
    const stale = fixture(); required(stale.suggestions[0]).textVersion = 0;
    assert.throws(() => run(stale, { type: 'suggestion', suggestionId: 'DEMO-S001', revision: 1, decision: 'accepted', note: '' }), /版本/);
  });
  test('改稿使重叠及旧建议失效', () => {
    const data = run(fixture(), { type: 'draft', reportId: R, revision: 1, text: '人工改写的合成审核工作稿。', note });
    assert.equal(required(data.suggestions[0]).state, 'stale');
    assert.equal(required(data.reports[0]).proof, 'stale');
  });
  test('已完成报告修改后重开，不能沿用完成状态', () => {
    const data = run(fixture(), { type: 'draft', reportId: 'DEMO-R003', revision: 1, text: '已修改的合成审核工作稿。', note });
    assert.equal(required(data.reports[2]).status, 'in_review');
    assert.equal(required(data.reports[2]).revision, 2);
  });
  test('人工替代不伪装自动正常，也不能跳过待办建议', () => {
    const data = run(fixture(), { type: 'manual', reportId: 'DEMO-R002', revision: 1, check: 'anomaly', note });
    assert.equal(required(data.reports[1]).anomaly, 'manual');
    let other = run(fixture(), { type: 'verify', reportId: R, revision: 1, note });
    assert.throws(() => run(other, { type: 'manual', reportId: R, revision: 2, check: 'proof', note }), /先处理/);
    other = run(other, { type: 'suggestion', suggestionId: 'DEMO-S001', revision: 2, decision: 'ignored', note });
    assert.equal(required(other.reports[0]).revision, 3);
  });
  test('成功路径完成核对、校对、处置与独立复核后才能完成报告', () => {
    let data = submitted();
    data = run(data, { type: 'approve', alertId: A, revision: 3, note }, reviewer);
    data = run(data, { type: 'verify', reportId: R, revision: 1, note });
    data = run(data, { type: 'suggestion', suggestionId: 'DEMO-S001', revision: 2, decision: 'ignored', note });
    data = run(data, { type: 'complete', reportId: R, revision: 3 });
    assert.equal(required(data.reports[0]).status, 'complete');
    assert.throws(() => run(data, { type: 'complete', reportId: R, revision: 4 }), /已经完成/);
  });
});

describe('配置、导入和治理', () => {
  test('无法判定和服务失败不进入异常率分母', () => {
    const metrics = officeMetrics(fixture(), worker);
    assert.equal(metrics.denominator, 2);
    assert.equal(metrics.abnormal, 1);
    assert.equal(metrics.excluded, 6);
    assert.equal(metrics.rate, '50.0%');
  });
  test('规则独立审批演示不改写历史报告', () => {
    const original = fixture();
    let data = run(original, { type: 'rule', ruleId: 'DEMO-RULE001', version: 1, action: 'submit', note }, admin);
    assert.throws(() => run(data, { type: 'rule', ruleId: 'DEMO-RULE001', version: 2, action: 'approve', note }, { ...admin, permissions: [...admin.permissions, 'publish'] }), /不能自审/);
    data = run(data, { type: 'rule', ruleId: 'DEMO-RULE001', version: 2, action: 'approve', note }, reviewer);
    data = run(data, { type: 'rule', ruleId: 'DEMO-RULE001', version: 3, action: 'publish', note }, reviewer);
    assert.equal(required(data.rules[0]).state, 'published');
    assert.deepEqual(data.reports, original.reports);
  });
  test('混合导入逐项拒绝或阻塞，不伪装已解析', () => {
    const data = run(fixture(), { type: 'import', files: [{ name: '合成.pdf', size: 42 }, { name: 'danger.exe', size: 23 }, { name: 'empty.png', size: 0 }, { name: 'large.docx', size: 51 * 1024 * 1024 }] });
    assert.deepEqual(data.imports.map((item) => item.state), ['blocked', 'rejected', 'rejected', 'rejected']);
    assert.equal(data.reports.length, 5);
    assert.equal(required(run(data, { type: 'cancel-import', jobId: 'IMP-1' }).imports[0]).state, 'cancelled');
  });
  test('空批次与超过 100 项批次拒绝', () => {
    assert.throws(() => run(fixture(), { type: 'import', files: [] }), /1 至 100/);
    assert.throws(() => run(fixture(), { type: 'import', files: Array.from({ length: 101 }, () => ({ name: 'a.pdf', size: 1 })) }), /1 至 100/);
  });
  test('停用前移交，停用后拒绝操作与数据读取', () => {
    assert.throws(() => run(fixture(), { type: 'disable-user', userId: 'worker', transfer: false }, admin), /先确认转移/);
    const data = run(acknowledged(), { type: 'disable-user', userId: 'worker', transfer: true }, admin);
    assert.equal(required(data.staff[0]).active, false);
    assert.equal(required(data.alerts[0]).owner, 'queue');
    assert.equal(required(data.alerts[0]).state, 'waiting');
    assert.equal(visibleReports(data, worker).length, 0);
    assert.throws(() => run(data, { type: 'ack', alertId: A, revision: 3 }), /停用/);
  });
  test('跨部门任务阻止不具备全范围权限的停用', () => {
    const data = fixture(); required(data.reports[4]).owner = 'worker';
    assert.throws(() => run(data, { type: 'disable-user', userId: 'worker', transfer: true }, admin), /其他部门/);
  });
  test('普通运行审计不保存报告正文，业务快照单独保存', () => {
    const data = run(fixture(), { type: 'draft', reportId: R, revision: 1, text: 'PRIVATE-SYNTHETIC-CONTENT', note });
    assert.equal(JSON.stringify(data.audit).includes('PRIVATE-SYNTHETIC-CONTENT'), false);
    assert.equal(data.changes.length, 1);
    assert.equal(required(data.changes[0]).reason, note);
  });
});
