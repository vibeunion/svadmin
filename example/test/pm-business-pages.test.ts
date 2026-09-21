// @vitest-environment happy-dom
import { requireValue } from '../../scripts/test-assertions';
import { mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Harness from './fixtures/BusinessPmHarness.svelte';
import { inMemoryDataProvider } from '../src/providers/inMemoryDb';
import { demoRenderers } from '../src/resource-rendering';
import { localDateKey, matchesTodoView, mondayOffset } from '../src/pages/workspace-policy';
import { recordLink } from '../src/pages/workspace-links';
import type { BaseRecord, DataProvider } from '@svadmin/core';

let mounted: ReturnType<typeof mount> | undefined;
const waitFor = vi.waitFor;
let target: HTMLDivElement;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#/';
  Object.defineProperty(window, 'confirm', { configurable: true, writable: true, value: () => true });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: () => ({ cancel() {}, finished: Promise.resolve() }) });
  target = document.createElement('div');
  document.body.append(target);
});
afterEach(async () => { if (mounted) await unmount(mounted); mounted = undefined; target.remove(); vi.restoreAllMocks(); });
async function render(resourceName: string, hash = `#/${resourceName}`, failResource = '') {
  window.location.hash = hash;
  if (failResource) {
    const getList = inMemoryDataProvider.getList.bind(inMemoryDataProvider);
    vi.spyOn(inMemoryDataProvider, 'getList').mockImplementation(async <T extends BaseRecord = BaseRecord>(params: Parameters<DataProvider['getList']>[0]) => {
      if (params.resource === failResource) throw new Error('Expected test failure');
      return getList<T>(params);
    });
  }
  mounted = mount(Harness, { target, props: { resourceName } });
  await tick();
}
function button(name: string): HTMLButtonElement {
  const element = [...target.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === name);
  if (!element) throw new Error(`Missing button: ${name}`);
  return element;
}
function fill(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
async function rows(resource: string) { return (await inMemoryDataProvider.getList({ resource, pagination: { mode: 'off' } })).data; }

describe('PM business acceptance', () => {
  it('uses a deterministic local day and Monday-based calendar offset', () => {
    expect(localDateKey(new Date(2026, 6, 1, 1))).toBe('2026-07-01');
    expect(mondayOffset(2026, 7)).toBe(2);
    expect(mondayOffset(2026, 6)).toBe(0);
    expect(mondayOffset(2026, 2)).toBe(6);
  });

  it('applies Todo view predicates to completion and date boundaries', () => {
    const todo = { dueDate: '2026-07-01', completed: false, priority: 'high' };
    expect(matchesTodoView(todo, 'today', '2026-07-01')).toBe(true);
    expect(matchesTodoView(todo, 'upcoming', '2026-07-01')).toBe(false);
    expect(matchesTodoView({ ...todo, completed: true }, 'priority', '2026-07-01')).toBe(false);
    expect(matchesTodoView({ ...todo, completed: true }, 'completed', '2026-07-01')).toBe(true);
  });

  it('encodes exact return context without permitting an external return target', () => {
    const route = '/todos?view=priority&filters=high%20risk';
    const href = recordLink('todos', 12, route);
    expect(new URLSearchParams(href.split('?')[1]).get('returnTo')).toBe(route);
    expect(new URLSearchParams(recordLink('todos', 12, '//evil.example').split('?')[1]).get('returnTo')).toBe('/');
  });

  it('persists Todo completion to the provider and survives remount', async () => {
    await render('todos');
    await waitFor(() => expect(target.querySelector('button[aria-label="Complete task"]')).not.toBeNull());
    const candidate = requireValue(target.querySelector<HTMLButtonElement>('button[aria-label="Complete task"]'));
    const article = requireValue(candidate.closest('article'));
    const href = requireValue(requireValue(article.querySelector('a')).getAttribute('href'));
    const id = Number(href.split('/').pop());
    candidate.click();
    await waitFor(async () => expect(demoRenderers.todos.records(await rows('todos')).find(item => item.id === id)?.completed).toBe(true));
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('todos', '#/todos?view=completed');
    await waitFor(() => expect(target.querySelector(`article a[href="#/todos/show/${id}"]`)).not.toBeNull());
    expect(target.querySelector('button[aria-label="Complete task"]')).toBeNull();
  });

  it('does not convert a failed Todo query into an empty board', async () => {
    await render('todos', '#/todos', 'todos');
    await waitFor(() => expect(target.textContent).toContain('Unable to load data'), { timeout: 8000 });
    expect(target.querySelector('button[aria-label="Complete task"]')).toBeNull();
    expect(button('Retry')).toBeDefined();
  });

  it('does not report Todo completion when storage rejects the update', async () => {
    await render('todos');
    await waitFor(() => expect(target.querySelector('button[aria-label="Complete task"]')).not.toBeNull());
    const before = demoRenderers.todos.records(await rows('todos')).filter(item => item.completed).length;
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    requireValue(target.querySelector<HTMLButtonElement>('button[aria-label="Complete task"]')).click();
    await waitFor(() => expect(target.querySelector('[role="alert"]')).not.toBeNull());
    expect(demoRenderers.todos.records(await rows('todos')).filter(item => item.completed)).toHaveLength(before);
  });

  it('opens the create route from the Todo primary action', async () => {
    await render('todos');
    await waitFor(() => expect(button('New task')).toBeDefined());
    button('New task').click();
    expect(window.location.hash).toBe('#/todos/create');
  });

  it('keeps warehouse records usable when an unrelated supplier query fails', async () => {
    await render('warehouses', '#/warehouses', 'suppliers');
    await waitFor(() => expect(target.textContent).toContain('Main Warehouse'));
    expect(target.textContent).not.toContain('Unable to load workspace data');
    expect(target.querySelector('a[href^="#/warehouses/show/"]')).not.toBeNull();
  });

  it('keeps completed project milestones visible', async () => {
    await inMemoryDataProvider.create({ resource: 'project_planning', variables: { milestone: 'PM completed milestone', ownerId: 1, dueDate: '2026-07-01', status: 'completed', confidence: 100, notes: 'done' } });
    await render('project_planning');
    await waitFor(() => expect(target.querySelector('[data-project-plan-layout]')?.textContent).toContain('PM completed milestone'));
  });

  it('resolves reorder-rule warehouses without blocking sales on warehouse failures', async () => {
    await render('reorder_rules');
    await waitFor(() => expect(target.querySelector('[data-reorder-layout]')?.textContent).toContain('Main Warehouse'));
    await unmount(requireValue(mounted)); mounted = undefined;
    await render('sales_orders', '#/sales_orders', 'warehouses');
    await waitFor(() => expect(target.querySelector('[data-order-layout="sales_orders"]')).not.toBeNull());
    expect(target.textContent).not.toContain('Unknown warehouse');
  });

  it('saves a mail draft and records a local send without external delivery', async () => {
    await render('mail_inbox');
    await waitFor(() => expect(button('Compose')).toBeDefined());
    button('Compose').click();
    await tick();
    const form = requireValue(target.querySelector('form'));
    fill(requireValue(form.querySelector<HTMLInputElement>('input[type="email"]')), 'pm@example.com');
    fill(requireValue(form.querySelector<HTMLInputElement>('input:not([type="email"])')), 'PM workflow draft');
    fill(requireValue(form.querySelector<HTMLTextAreaElement>('textarea')), 'Local-only body.');
    await tick();
    button('Save draft').click();
    await waitFor(async () => expect(demoRenderers.mail_draft.records(await rows('mail_draft')).some(item => item.subject === 'PM workflow draft')).toBe(true));
    await waitFor(() => expect(button('Send locally').disabled).toBe(false));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(async () => expect(demoRenderers.mail_sent.records(await rows('mail_sent')).some(item => item.subject === 'PM workflow draft')).toBe(true));
    await waitFor(() => expect(target.textContent).toContain('No real email was delivered'));
    expect(demoRenderers.mail_draft.records(await rows('mail_draft')).some(item => item.subject === 'PM workflow draft')).toBe(false);
  });

  it('archives the selected inbox message rather than leaving an inert action', async () => {
    await render('mail_inbox');
    await waitFor(() => expect(button('Archive')).toBeDefined());
    const before = demoRenderers.mail_inbox.records(await rows('mail_inbox'));
    const subject = requireValue(target.querySelector('article h2')).textContent;
    button('Archive').click();
    await waitFor(async () => expect((await rows('mail_inbox')).length).toBe(before.length - 1));
    expect(demoRenderers.mail_archive.records(await rows('mail_archive')).some(item => item.subject === subject)).toBe(true);
  });

  it('keeps both folders unchanged on a failed atomic move and retries once', async () => {
    await render('mail_inbox');
    await waitFor(() => expect(button('Archive')).toBeDefined());
    const before = (await rows('mail_archive')).length;
    const sourceBefore = await rows('mail_inbox');
    const fail = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage full'); });
    button('Archive').click();
    await waitFor(() => expect(target.textContent).toContain('Source and destination are unchanged'));
    expect(await rows('mail_archive')).toHaveLength(before);
    expect(await rows('mail_inbox')).toEqual(sourceBefore);
    button('Archive').click();
    await waitFor(() => expect(target.textContent).toContain('Message moved.'));
    expect(await rows('mail_archive')).toHaveLength(before + 1);
    expect(fail).toHaveBeenCalledTimes(2);
  });

  it('retains an unsent draft after storage failure and atomically sends it on retry', async () => {
    await render('mail_draft');
    await waitFor(() => expect(button('Continue draft')).toBeDefined());
    button('Continue draft').click();
    await tick();
    fill(requireValue(target.querySelector('input[type="email"]')), 'pm@example.com');
    await tick();
    const before = (await rows('mail_sent')).length;
    const draftsBefore = await rows('mail_draft');
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage full'); });
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(target.textContent).toContain('Operation incomplete'));
    expect(await rows('mail_sent')).toHaveLength(before);
    expect(await rows('mail_draft')).toEqual(draftsBefore);
    await waitFor(() => expect(button('Send locally').disabled).toBe(false));
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(target.textContent).toContain('No real email was delivered'));
    expect(await rows('mail_sent')).toHaveLength(before + 1);
    expect(await rows('mail_draft')).toHaveLength(draftsBefore.length - 1);
  });

  it('resumes collapsed mail and protects unsaved content when changing folders', async () => {
    await render('mail_inbox');
    button('Compose').click();
    await tick();
    fill(requireValue(target.querySelector('textarea')), 'Keep this unsaved message');
    await tick();
    button('Collapse').click();
    await tick();
    button('Resume editing').click();
    await tick();
    expect(requireValue(target.querySelector('textarea')).value).toBe('Keep this unsaved message');
    button('Collapse').click();
    await tick();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    requireValue(target.querySelector('nav a[href="#/mail_draft"]')).dispatchEvent(event);
    expect(confirm).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    button('Resume editing').click();
    await tick();
    expect(requireValue(target.querySelector('textarea')).value).toBe('Keep this unsaved message');
  });

  it('retains unsaved mail when local persistence rejects', async () => {
    await render('mail_inbox');
    button('Compose').click();
    await tick();
    fill(requireValue(target.querySelector('input:not([type="email"])')), 'Storage failure');
    fill(requireValue(target.querySelector('textarea')), 'Retain the body');
    await tick();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    button('Save draft').click();
    await waitFor(() => expect(target.textContent).toContain('Operation incomplete'));
    expect(requireValue(target.querySelector('textarea')).value).toBe('Retain the body');
    expect(target.textContent).not.toContain('Draft saved.');
  });

  it('runs the actual read-only chat provider and saves a new thread from an empty selection', async () => {
    await render('ai_conversations', '#/ai_conversations?view=new');
    await waitFor(() => expect(target.querySelector('textarea')).not.toBeNull());
    fill(requireValue(target.querySelector('textarea')), 'Which products have low stock?');
    await tick();
    requireValue(target.querySelector('form')).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(async () => expect(demoRenderers.ai_conversations.records(await rows('ai_conversations')).some(item => item.title === 'Which products have low stock?' && item.lastMessage.includes('Low-stock products:'))).toBe(true));
    expect(window.location.hash).not.toBe('#/ai_conversations?view=new');
  });

  it('shows permission effects in the selected role summary', async () => {
    await render('roles');
    await waitFor(() => expect(target.textContent).toContain('Inventory Admin'));
    expect(target.textContent).toMatch(/allow|Allow/);
  });

  it('requires confirmation before deleting local AI history', async () => {
    await render('ai_conversations');
    await waitFor(() => expect(button('Clear local history').disabled).toBe(false));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const before = (await rows('ai_conversations')).length;
    button('Clear local history').click();
    expect((await rows('ai_conversations')).length).toBe(before);
    confirm.mockReturnValue(true);
    button('Clear local history').click();
    await waitFor(async () => expect(await rows('ai_conversations')).toHaveLength(0));
    await waitFor(() => expect(target.textContent).toContain('Local history cleared.'));
  });
});
