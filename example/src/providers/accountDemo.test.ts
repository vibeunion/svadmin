import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { exampleMemberDirectory, exampleNotificationPreferences } from './accountDemo';
import { mockAuthProvider } from './mockAuth';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map<string, string>();
let failWrites = false;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error('Storage is unavailable');
      values.set(key, value);
    },
  },
});
beforeEach(() => {
  values.clear(); failWrites = false;
  values.set('svadmin_demo_auth', JSON.stringify({ email: 'demo@example.com' }));
});
afterAll(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('example account provider contracts', () => {
  test('demo identity uses the local avatar fallback without an external request', async () => {
    const identity = await mockAuthProvider.getIdentity?.();
    expect(identity?.name).toBe('demo');
    expect(identity?.avatar).toBeUndefined();
  });
  test('preferences survive reload and default values are not shared mutable state', async () => {
    const initial = await exampleNotificationPreferences.load();
    initial.email.security = false;
    expect((await exampleNotificationPreferences.load()).email.security).toBe(true);
    await exampleNotificationPreferences.save(initial);
    expect((await exampleNotificationPreferences.load()).email.security).toBe(false);
  });
  test('invalid storage and failed writes are errors, not successful saves', async () => {
    const initial = await exampleNotificationPreferences.load();
    values.set('svadmin-example-notification-preferences-v1:demo%40example.com', '{"email":false}');
    await expect(exampleNotificationPreferences.load()).rejects.toThrow('格式无效');
    failWrites = true;
    await expect(exampleNotificationPreferences.save(initial)).rejects.toThrow('Storage is unavailable');
  });
  test('member directory reads configured records without promising invitation delivery', async () => {
    const members = await exampleMemberDirectory.list();
    expect(members.length).toBeGreaterThan(0);
    expect(members.every(member => member.id && member.name && member.email && member.role)).toBe(true);
    expect(exampleMemberDirectory.invite).toBeUndefined();
    expect(exampleMemberDirectory.invitationUrl).toBeUndefined();
  });
  test('different demo accounts do not share notification preferences', async () => {
    const preferences = await exampleNotificationPreferences.load();
    preferences.email.security = false;
    await exampleNotificationPreferences.save(preferences);
    values.set('svadmin_demo_auth', JSON.stringify({ email: 'second@example.com' }));
    expect((await exampleNotificationPreferences.load()).email.security).toBe(true);
    values.delete('svadmin_demo_auth');
    await expect(exampleNotificationPreferences.load()).rejects.toThrow('请先登录');
  });
});
