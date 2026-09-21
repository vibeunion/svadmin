// @vitest-environment happy-dom
import { requireValue } from '../../scripts/test-assertions';
import { mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessControlProvider, AuthProvider } from '@svadmin/core';
import { inMemoryDataProvider, moveLocalMail, sendLocalMail, type LocalMailMove, type LocalMailSend } from '../src/providers/inMemoryDb';
import { mailSourceFingerprint } from '../src/providers/mail-source';
import { executeLocalMail } from '../src/providers/mail-operations';
import { createResources } from '../src/resources';
import Harness from './fixtures/BusinessPmHarness.svelte';

let moveInput: LocalMailMove;
let sendInput: LocalMailSend;
const rows = async (resource: string) => (await inMemoryDataProvider.getList({ resource, pagination: { mode: 'off' } })).data;
const state = async () => ({ inbox: await rows('mail_inbox'), archive: await rows('mail_archive'), drafts: await rows('mail_draft'), sent: await rows('mail_sent') });
function context() {
  return {
    providers: { default: inMemoryDataProvider },
    authProvider: null as AuthProvider | null,
    accessControlProvider: null as (AccessControlProvider & { options: NonNullable<AccessControlProvider['options']> }) | null,
    resources: createResources('en'),
    tenant: undefined,
    routerProvider: undefined,
    getProviderMeta: () => ({}),
  };
}
let mounted: ReturnType<typeof mount> | undefined;
let target: HTMLDivElement;
beforeEach(async () => {
  localStorage.clear();
  moveInput = { source: 'mail_inbox', target: 'mail_archive', id: 1, expectedSource: mailSourceFingerprint(requireValue((await rows('mail_inbox'))[0])) };
  sendInput = { draftId: 1, expectedSource: mailSourceFingerprint(requireValue((await rows('mail_draft'))[0])), to: 'reader@example.com', subject: 'Atomic send', body: 'Local only' };
  target = document.createElement('div'); document.body.append(target);
  Object.defineProperty(window, 'confirm', { configurable: true, writable: true, value: () => true });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: () => ({ cancel() {}, finished: Promise.resolve() }) });
});
afterEach(async () => {
  if (mounted) await unmount(mounted);
  mounted = undefined; target.remove(); vi.restoreAllMocks();
});
async function render(resourceName: string) {
  window.location.hash = `#/${resourceName}`;
  mounted = mount(Harness, { target, props: { resourceName } }); await tick();
}
function button(name: string) {
  const item = [...target.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.trim() === name);
  if (!item) throw new Error(`Missing button ${name}`);
  return item;
}

describe('local atomic mail', () => {
  it('commits a move in one storage write and does not duplicate a stale retry', async () => {
    const before = await state();
    const write = vi.spyOn(localStorage, 'setItem');
    moveLocalMail(moveInput);
    expect(write).toHaveBeenCalledTimes(1);
    const after = await state();
    expect(after.inbox).toHaveLength(before.inbox.length - 1);
    expect(after.archive).toHaveLength(before.archive.length + 1);
    expect(after.archive.at(-1)?.subject).toBe(before.inbox[0]?.subject);
    expect(() => moveLocalMail(moveInput)).toThrow();
    expect(await state()).toEqual(after);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('commits local Sent and draft removal together and rejects a stale resend', async () => {
    const before = await state();
    const write = vi.spyOn(localStorage, 'setItem');
    sendLocalMail(sendInput);
    expect(write).toHaveBeenCalledTimes(1);
    const after = await state();
    expect(after.drafts).toHaveLength(before.drafts.length - 1);
    expect(after.sent).toHaveLength(before.sent.length + 1);
    expect(() => sendLocalMail(sendInput)).toThrow();
    expect(await state()).toEqual(after);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('supports new local mail without a draft', async () => {
    const before = await state();
    sendLocalMail({ to: sendInput.to, subject: sendInput.subject, body: sendInput.body });
    expect(await rows('mail_draft')).toEqual(before.drafts);
    expect(await rows('mail_sent')).toHaveLength(before.sent.length + 1);
  });

  for (const kind of ['move', 'send'] as const) {
    it(`${kind} leaves storage and memory unchanged on failure, then succeeds after a fresh read`, async () => {
      // 先建立已提交快照，以便检查拒绝写入之后的内存回退。
      await inMemoryDataProvider.update({ resource: 'mail_inbox', id: 1, variables: { unread: true } });
      moveInput.expectedSource = mailSourceFingerprint(requireValue((await rows('mail_inbox'))[0]));
      const before = await state();
      const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
      const execute = () => kind === 'move' ? moveLocalMail(moveInput) : sendLocalMail(sendInput);
      expect(execute).toThrow('Storage full');
      expect(await state()).toEqual(before);
      const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Cannot read'); });
      expect(await state()).toEqual(before);
      read.mockRestore(); write.mockRestore();
      // 新调用没有任何 pendingMove/sentDraftId，完全从持久化源记录恢复。
      await executeLocalMail(context(), kind === 'move' ? { kind, input: moveInput } : { kind, input: sendInput });
      const after = await state();
      expect(kind === 'move' ? after.archive : after.sent).toHaveLength((kind === 'move' ? before.archive : before.sent).length + 1);
    });
  }

  it('validates invalid folder, self-move, missing source and malformed send before saving', async () => {
    const before = await state();
    const write = vi.spyOn(localStorage, 'setItem');
    expect(() => moveLocalMail({ ...moveInput, source: 'mail_archive' })).toThrow();
    expect(() => moveLocalMail({ ...moveInput, id: 99999 })).toThrow();
    expect(() => sendLocalMail({ ...sendInput, draftId: 99999 })).toThrow();
    expect(() => sendLocalMail({ ...sendInput, to: 'invalid' })).toThrow();
    expect(() => sendLocalMail({ ...sendInput, subject: ' ' })).toThrow();
    expect(write).not.toHaveBeenCalled();
    expect(await state()).toEqual(before);
  });

  it('does not overwrite persisted data from an old memory snapshot when storage reads fail', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Read unavailable'); });
    const write = vi.spyOn(localStorage, 'setItem');
    expect(() => moveLocalMail(moveInput)).toThrow('Read unavailable');
    expect(() => sendLocalMail(sendInput)).toThrow('Read unavailable');
    expect(write).not.toHaveBeenCalled();
  });

  it('requires both target create and source delete permission', async () => {
    const owner = context();
    const can = vi.fn<AccessControlProvider['can']>().mockResolvedValueOnce({ can: true }).mockResolvedValueOnce({ can: false });
    owner.accessControlProvider = { can, options: {} };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'move', input: moveInput })).rejects.toThrow('permission denied');
    expect(can.mock.calls.map(([request]) => [request.resource, request.action])).toEqual([
      ['mail_archive', 'create'], ['mail_inbox', 'delete'],
    ]);
    expect(await state()).toEqual(before);
  });

  it('checks draft delete permission as well as sent create', async () => {
    const owner = context();
    const can = vi.fn<AccessControlProvider['can']>().mockResolvedValueOnce({ can: true }).mockResolvedValueOnce({ can: false });
    owner.accessControlProvider = { can, options: {} };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'send', input: sendInput })).rejects.toThrow();
    expect(can.mock.calls[1]?.[0]).toMatchObject({ resource: 'mail_draft', action: 'delete', params: { id: 1 } });
    expect(await state()).toEqual(before);
  });

  it('rejects a replay after draft ID 2 is reused, including an identical body and timestamp', async () => {
    const original = requireValue((await rows('mail_draft')).find(row => row.id === 2));
    expect(original).toBeDefined();
    const stale = { ...sendInput, draftId: 2, expectedSource: mailSourceFingerprint(original) };
    sendLocalMail(stale);
    const { id: _id, ...variables } = original;
    const replacement = (await inMemoryDataProvider.create({ resource: 'mail_draft', variables })).data;
    expect(replacement.id).toBe(2);
    expect(replacement.mailRevision).not.toBe(original.mailRevision);
    const beforeReplay = await state();
    expect(() => sendLocalMail(stale)).toThrow('source changed');
    expect(await state()).toEqual(beforeReplay);
  });

  it('rejects duplicate source IDs before either of two send attempts', async () => {
    const original = requireValue((await rows('mail_draft'))[0]);
    await inMemoryDataProvider.update({ resource: 'mail_draft', id: requireValue(original.id), variables: { subject: original.subject } });
    const key = requireValue(localStorage.key(0));
    const stored: Record<string, unknown> = JSON.parse(requireValue(localStorage.getItem(key)));
    const drafts = await rows('mail_draft');
    stored['mail_draft'] = [...drafts, structuredClone(drafts[0])];
    localStorage.setItem(key, JSON.stringify(stored));
    const input = { ...sendInput, expectedSource: mailSourceFingerprint(requireValue(drafts[0])) };
    const before = await state();
    const write = vi.spyOn(localStorage, 'setItem');
    expect(() => sendLocalMail(input)).toThrow('ambiguous');
    expect(() => sendLocalMail(input)).toThrow('ambiguous');
    expect(write).not.toHaveBeenCalled();
    expect(await state()).toEqual(before);
  });

  it('rejects duplicate received IDs before moving either matching row', async () => {
    await inMemoryDataProvider.update({ resource: 'mail_inbox', id: 1, variables: { unread: true } });
    const key = requireValue(localStorage.key(0));
    const stored: Record<string, unknown> = JSON.parse(requireValue(localStorage.getItem(key)));
    const inbox = await rows('mail_inbox');
    stored['mail_inbox'] = [...inbox, structuredClone(inbox[0])];
    localStorage.setItem(key, JSON.stringify(stored));
    const before = await state();
    expect(() => moveLocalMail({ ...moveInput, expectedSource: mailSourceFingerprint(requireValue(inbox[0])) })).toThrow('ambiguous');
    expect(await state()).toEqual(before);
  });

  it('rejects a moved record updated while authorization is waiting', async () => {
    const owner = context();
    owner.accessControlProvider = { options: {}, can: async () => {
      await inMemoryDataProvider.update({ resource: 'mail_inbox', id: 1, variables: { body: 'Changed in another view' } });
      return { can: true };
    } };
    const beforeArchive = await rows('mail_archive');
    await expect(executeLocalMail(owner, { kind: 'move', input: moveInput })).rejects.toThrow('source changed');
    expect(await rows('mail_archive')).toEqual(beforeArchive);
    expect((await rows('mail_inbox')).find(row => row.id === 1)?.body).toBe('Changed in another view');
  });

  it('rejects same-object identity changes while authorization is waiting', async () => {
    const owner = context();
    let email = 'first@example.com';
    const auth: AuthProvider = {
      check: async () => ({ authenticated: true }),
      login: async () => ({ success: true }), logout: async () => ({ success: true }),
      getIdentity: async () => ({ id: '1', email }),
    };
    owner.authProvider = auth;
    owner.accessControlProvider = { options: {}, can: async () => { email = 'second@example.com'; return { can: true }; } };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'send', input: sendInput })).rejects.toThrow('identity changed');
    expect(owner.authProvider).toBe(auth);
    expect(await state()).toEqual(before);
  });

  it('rejects same-object sign-out while authorization is waiting', async () => {
    const owner = context();
    let authenticated = true;
    owner.authProvider = {
      check: async () => ({ authenticated }),
      login: async () => ({ success: true }), logout: async () => ({ success: true }),
    };
    owner.accessControlProvider = { options: {}, can: async () => { authenticated = false; return { can: true }; } };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'send', input: sendInput })).rejects.toThrow('no longer authenticated');
    expect(await state()).toEqual(before);
  });

  it('rejects in-place canDelete revocation during the final permission check', async () => {
    const owner = context();
    owner.accessControlProvider = { options: {}, can: async ({ action }) => {
      if (action === 'delete') requireValue(owner.resources.find(resource => resource.name === 'mail_draft')).canDelete = false;
      return { can: true };
    } };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'send', input: sendInput })).rejects.toThrow('not permitted');
    expect(await state()).toEqual(before);
  });

  it('does not dispatch through a different provider or a denied resource capability', async () => {
    const owner = context();
    owner.providers.default = { ...inMemoryDataProvider };
    await expect(executeLocalMail(owner, { kind: 'move', input: moveInput })).rejects.toThrow();
    const fresh = context();
    requireValue(fresh.resources.find(resource => resource.name === 'mail_sent')).canCreate = false;
    await expect(executeLocalMail(fresh, { kind: 'send', input: sendInput })).rejects.toThrow();
  });

  it('rejects signed-out authentication and host changes during authorization', async () => {
    const owner = context();
    owner.authProvider = { check: async () => ({ authenticated: false }), login: async () => ({ success: false }), logout: async () => ({ success: true }) };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'move', input: moveInput })).rejects.toThrow();
    const fresh = context();
    fresh.accessControlProvider = { options: {}, can: async () => {
      fresh.providers.default = { ...inMemoryDataProvider };
      return { can: true };
    } };
    await expect(executeLocalMail(fresh, { kind: 'move', input: moveInput })).rejects.toThrow();
    expect(await state()).toEqual(before);
  });

  it('cancels a write if the page unmounts during authorization', async () => {
    const owner = context(); let active = true;
    owner.accessControlProvider = { options: {}, can: async () => { active = false; return { can: true }; } };
    const before = await state();
    await expect(executeLocalMail(owner, { kind: 'move', input: moveInput }, () => active)).rejects.toThrow();
    expect(await state()).toEqual(before);
  });

  it('updates the inbox view and stays moved after page remount', async () => {
    await render('mail_inbox');
    await vi.waitFor(() => expect(button('Archive')).toBeDefined());
    const subject = requireValue(target.querySelector('article h2')).textContent;
    button('Archive').click();
    await vi.waitFor(() => expect(target.textContent).toContain('Message moved.'));
    await vi.waitFor(() => expect(target.querySelector('article h2')?.textContent).not.toBe(subject));
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('mail_archive');
    await vi.waitFor(() => expect(target.textContent).toContain(subject));
    expect((await rows('mail_archive')).filter(row => row.subject === subject)).toHaveLength(1);
  });

  it('keeps the UI source snapshot fixed when another view replaces a draft with the same ID', async () => {
    await render('mail_draft');
    await vi.waitFor(() => expect(button('Continue draft')).toBeDefined());
    button('Continue draft').click(); await tick();
    const drafts = await rows('mail_draft');
    const original = requireValue(drafts[0]);
    await requireValue(inMemoryDataProvider.deleteMany)({ resource: 'mail_draft', ids: drafts.map(row => Number(row.id)) });
    const { id: _id, ...variables } = original;
    const replacement = (await inMemoryDataProvider.create({ resource: 'mail_draft', variables })).data;
    expect(replacement.id).toBe(original.id);
    const before = await state();
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(target.textContent).toContain('Operation incomplete'));
    expect(await state()).toEqual(before);
    expect(target.querySelector('textarea')).not.toBeNull();
  });

  it('retains the draft on denied persistence and sends once after remount', async () => {
    await render('mail_draft');
    await vi.waitFor(() => expect(button('Continue draft')).toBeDefined());
    button('Continue draft').click(); await tick();
    const before = await state();
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(target.textContent).toContain('Operation incomplete'));
    expect(await state()).toEqual(before);
    expect(requireValue(target.querySelector('textarea')).value.length).toBeGreaterThan(0);
    write.mockRestore();
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('mail_draft');
    await vi.waitFor(() => expect(button('Continue draft')).toBeDefined());
    button('Continue draft').click(); await tick();
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(target.textContent).toContain('No real email was delivered'));
    expect(await rows('mail_sent')).toHaveLength(before.sent.length + 1);
    expect(await rows('mail_draft')).toHaveLength(before.drafts.length - 1);
  });

  it('keeps a committed send successful when refreshing fails, and retries only reads', async () => {
    await render('mail_draft');
    await vi.waitFor(() => expect(button('Continue draft')).toBeDefined());
    button('Continue draft').click(); await tick();
    const before = await state();
    const write = vi.spyOn(localStorage, 'setItem');
    const reads = vi.spyOn(inMemoryDataProvider, 'getList').mockRejectedValue(new Error('Temporary query failure'));
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(target.textContent).toContain('Write completed, but list refresh failed'), { timeout: 12000 });
    expect(target.textContent).toContain('No real email was delivered');
    expect(target.textContent).not.toContain('Operation incomplete');
    expect(target.querySelector('form')).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
    reads.mockRestore();
    button('Refresh mail lists').click();
    await vi.waitFor(() => expect(target.textContent).not.toContain('Write completed, but list refresh failed'));
    expect(write).toHaveBeenCalledTimes(1);
    expect(await rows('mail_sent')).toHaveLength(before.sent.length + 1);
    expect(await rows('mail_draft')).toHaveLength(before.drafts.length - 1);
  }, 15000);
});
