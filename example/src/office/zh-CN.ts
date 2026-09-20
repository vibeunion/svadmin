import type { Permission, OfficeCommand } from './domain';

/** 仅转换产品显示文案；状态、权限、编号和接口字段保持原始机器值。 */
export const permissionLabels: Record<Permission, string> = {
  read: '查看报告', verify: '核对数据', handle: '处置预警', review: '独立复核',
  proof: '文档校对', original: '访问原件', rules: '配置规则', publish: '审批发布',
  users: '管理用户', audit: '查看审计',
};
const actorLabels: Record<string, string> = {
  worker: '演示审核员', reviewer: '演示业务复核员', admin: '演示配置管理员',
  auditor: '演示审计员', queue: '部门待分配队列', 'system-demo': '演示系统',
  'south-worker': '南区演示审核员',
};
const stateLabels: Record<string, string> = {
  waiting: '待确认', processing: '处理中', review: '待复核', closed: '已关闭',
  draft: '草稿', approved: '已复核', published: '演示发布完成',
};
export const commandLabels: Record<OfficeCommand['type'], string> = {
  verify: '核对数据', manual: '记录人工检查', complete: '完成报告审核', ack: '领取并确认预警',
  propose: '提交预警处置', approve: '独立复核预警', suggestion: '处理校对建议',
  draft: '保存审核稿', whitelist: '申请白名单', 'read-message': '标记消息已读',
  rule: '处理规则审批', import: '建立导入预检', 'cancel-import': '取消导入预检',
  'disable-user': '停用账号并移交任务',
};
export function actorLabel(id: string | null): string {
  return id === null ? '尚未指定' : Object.hasOwn(actorLabels, id) ? actorLabels[id] ?? '未识别人员' : '未识别人员';
}
export function permissionLabel(permission: Permission): string {
  return Object.hasOwn(permissionLabels, permission) ? permissionLabels[permission] : '未识别权限';
}
export function stateLabel(state: string): string {
  return Object.hasOwn(stateLabels, state) ? stateLabels[state] ?? '未知状态' : '未知状态';
}
export function actionLabel(value: string): string {
  // 人工填写的原因原样保留；仅翻译历史记录中系统生成的动作代号。
  const label = Object.entries(commandLabels).find(([key]) => key === value)?.[1];
  return label ?? value.replace('超过建议的 50 MB 限制', '超过建议的 50 兆字节限制');
}
export function auditLabel(value: string): string {
  return value.replace('演示规则submit；', '演示规则提交；')
    .replace('演示规则approve；', '演示规则复核；')
    .replace('演示规则publish；', '演示规则发布；');
}
export function recordLabel(value: string): string {
  if (Object.hasOwn(actorLabels, value)) return actorLabel(value);
  const systemObjects: Record<string, string> = { 'demo-session': '演示会话', 'import-preview': '导入预检' };
  if (Object.hasOwn(systemObjects, value)) return systemObjects[value] ?? value;
  // 业务编号保持原值，便于与接口、文件和审计证据对应。
  return value;
}
export function chineseMenuLabel(label: string): string {
  return label.replace(/\bAI\b/g, '智能').replace(/\bAPI\b/g, '接口')
    .replace(/\bCRM\b/g, '客户管理').replace(/\bSKU\b/g, '商品规格')
    .replace(/\bNFT\b/g, '数字藏品');
}
export function isOfficeLocation(hash: string, search = ''): boolean {
  return /^#\/health_office(?:[/?]|$)/.test(hash) || new URLSearchParams(search).get('officeApp') === '1';
}
export function isOfficeAuthRoute(hash: string): boolean {
  return /^#\/(?:login|register|forgot-password|update-password)(?:[/?]|$)/.test(hash);
}
