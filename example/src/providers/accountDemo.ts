import type { NotificationPreferences, NotificationPreferencesProvider } from '@svadmin/ui/components/NotificationsSettings.svelte';
import type { MemberDirectoryProvider } from '@svadmin/ui/components/account/MemberDirectory.svelte';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { inMemoryDataProvider } from './inMemoryDb';
import { demoRenderers } from '../resource-rendering';
import { mockAuthProvider } from './mockAuth';

const preferenceSchema = Type.Object({
  email: Type.Object({ security: Type.Boolean(), activity: Type.Boolean(), reports: Type.Boolean() }),
  push: Type.Object({ security: Type.Boolean(), activity: Type.Boolean(), reports: Type.Boolean() }),
  sms: Type.Object({ security: Type.Boolean() }),
});
const storageKey = 'svadmin-example-notification-preferences-v1';
const defaults: NotificationPreferences = {
  email: { security: true, activity: false, reports: true },
  push: { security: true, activity: true, reports: false },
  sms: { security: true },
};
async function preferenceKey(): Promise<string> {
  const identity = await mockAuthProvider.getIdentity?.();
  if (!identity?.email) throw new Error('请先登录再读取或保存通知偏好。');
  return `${storageKey}:${encodeURIComponent(identity.email)}`;
}

// 本机偏好只驱动示例表单，不代表真实通知渠道已经配置。
export const exampleNotificationPreferences: NotificationPreferencesProvider = {
  description: '仅保存本机演示偏好，不会变更实际通知渠道。 Local demo preferences only; no real delivery channels are changed.',
  async load() {
    const stored = localStorage.getItem(await preferenceKey());
    if (!stored) return structuredClone(defaults);
    const value: unknown = JSON.parse(stored);
    if (!Value.Check(preferenceSchema, value)) throw new Error('本机通知偏好格式无效，请清除此示例的偏好后重试。');
    return value;
  },
  async save(preferences) {
    if (!Value.Check(preferenceSchema, preferences)) throw new Error('通知偏好格式无效');
    localStorage.setItem(await preferenceKey(), JSON.stringify(preferences));
  },
};

export const exampleMemberDirectory: MemberDirectoryProvider = {
  description: '目录来自本机样例用户，未接入真实邀请服务。 Local sample members; invitation delivery is not connected.',
  async list() {
    const [members, roles] = await Promise.all([
      inMemoryDataProvider.getList({ resource: 'users', pagination: { mode: 'off' } }),
      inMemoryDataProvider.getList({ resource: 'roles', pagination: { mode: 'off' } }),
    ]);
    const roleNames = new Map(demoRenderers.roles.records(roles.data).map(role => [role.id, role.name]));
    return demoRenderers.users.records(members.data).map(member => ({
      id: String(member.id), name: member.name, email: member.email,
      role: roleNames.get(member.roleId) ?? String(member.roleId),
    }));
  },
};
