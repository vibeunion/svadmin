import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { actorLabel, permissionLabels, permissionLabel, stateLabel, actionLabel, auditLabel, recordLabel, commandLabels, isOfficeLocation, isOfficeAuthRoute } from './zh-CN';
import { actors, createOfficeData, executeOfficeCommand } from './domain';

describe('智能辅助办公中文显示契约', () => {
  test('所有角色、权限和系统动作均提供中文名称', () => {
    for (const actor of actors) {
      assert.match(actorLabel(actor.id), /[\u4e00-\u9fff]/);
      for (const permission of actor.permissions) assert.equal(permissionLabel(permission), permissionLabels[permission]);
    }
    for (const label of Object.values(commandLabels)) assert.match(label, /^[\u4e00-\u9fff]+$/);
    assert.equal(actorLabel('system-demo'), '演示系统');
    assert.equal(actorLabel('queue'), '部门待分配队列');
  });
  test('未知代号不泄漏为英文名称或原型属性', () => {
    assert.equal(actorLabel('constructor'), '未识别人员');
    assert.equal(stateLabel('toString'), '未知状态');
    assert.equal(actorLabel(null), '尚未指定');
  });
  test('历史状态和系统生成的变更原因使用中文', () => {
    assert.equal(stateLabel('processing'), '处理中');
    assert.equal(stateLabel('review'), '待复核');
    assert.equal(actionLabel('ack'), '领取并确认预警');
    assert.equal(actionLabel('disable-user'), '停用账号并移交任务');
    assert.equal(auditLabel('演示规则publish；不启用医学判定'), '演示规则发布；不启用医学判定');
  });
  test('原始报告、文件名、编号和人工依据不被翻译层改写', () => {
    const original = createOfficeData();
    const before = structuredClone(original);
    for (const report of original.reports) assert.equal(recordLabel(report.id), report.id);
    assert.equal(recordLabel('report.pdf'), 'report.pdf');
    assert.equal(actionLabel('人工核对来源 alpha-123'), '人工核对来源 alpha-123');
    assert.deepEqual(original, before);
  });
  test('新增历史记录仍保留机器状态，仅在展示时转换', () => {
    const worker = actors.find((actor) => actor.id === 'worker');
    assert.ok(worker);
    const data = executeOfficeCommand(createOfficeData(), worker, { type: 'ack', alertId: 'DEMO-A001', revision: 1 });
    const change = data.changes.find((item) => item.object === 'DEMO-A001');
    assert.ok(change);
    assert.equal(change.reason, 'ack');
    assert.equal(actionLabel(change.reason), '领取并确认预警');
    assert.equal(actorLabel(change.actor), '演示审核员');
  });
  test('办公路由与显式中文登录入口匹配，不误匹配其他示例', () => {
    assert.equal(isOfficeLocation('#/health_office'), true);
    assert.equal(isOfficeLocation('#/health_office?officeView=reports'), true);
    assert.equal(isOfficeLocation('#/login', '?officeApp=1'), true);
    assert.equal(isOfficeLocation('#/health_office_other'), false);
    assert.equal(isOfficeLocation('#/products'), false);
    assert.equal(isOfficeAuthRoute('#/login'), true);
    assert.equal(isOfficeAuthRoute('#/forgot-password'), true);
    assert.equal(isOfficeAuthRoute('#/products'), false);
  });
});
