// @vitest-environment happy-dom
import { mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserManagementPageHarness from './fixtures/UserManagementPageHarness.svelte';

let mounted: ReturnType<typeof mount> | undefined;
let target: HTMLDivElement | undefined;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/';
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(async () => {
  if (mounted) await unmount(mounted);
  target?.remove();
  mounted = undefined;
  target = undefined;
});

async function renderPage() {
  target = document.createElement('div');
  document.body.append(target);
  mounted = mount(UserManagementPageHarness, { target });
  const directory = () => document.querySelector<HTMLTableElement>('table[aria-label="User directory"]');
  await vi.waitFor(() => expect(directory()).not.toBeNull());
  return directory;
}

function rows(directory: () => HTMLTableElement | null): HTMLTableRowElement[] {
  return [...(directory()?.querySelectorAll<HTMLTableRowElement>('tbody tr') ?? [])];
}

function button(name: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((candidate) => candidate.textContent?.trim() === name);
  if (!match) throw new Error(`Button not found: ${name}`);
  return match;
}

async function chooseFilter(triggerName: string, optionName: string) {
  button(triggerName).click();
  await tick();
  const option = [...document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')]
    .find((candidate) => candidate.textContent?.trim() === optionName);
  if (!option) throw new Error(`Filter option not found: ${optionName}`);
  option.click();
  await tick();
}

describe('UserManagementPage filters', () => {
  it('offers view and edit actions from the primary user directory', async () => {
    const directory = await renderPage();
    const firstRow = rows(directory)[0];

    expect(firstRow?.querySelector('a[href="#/users/show/1"]')).not.toBeNull();
    expect(firstRow?.querySelector('a[href="#/users/edit/1"]')).not.toBeNull();
  });

  it('filters the user directory by role', async () => {
    const directory = await renderPage();
    expect(rows(directory)).toHaveLength(4);

    await chooseFilter('All roles', 'Inventory Admin');

    await vi.waitFor(() => {
      const visibleRows = rows(directory);
      expect(visibleRows).toHaveLength(1);
      expect(visibleRows[0]?.textContent).toContain('Jordan Lee');
      expect(directory()?.textContent).not.toContain('Priya Raman');
    });
  });

  it('combines status and role filters and renders the empty state', async () => {
    const directory = await renderPage();

    await chooseFilter('All users', 'Invited');
    await vi.waitFor(() => {
      expect(rows(directory)).toHaveLength(1);
      expect(directory()?.textContent).toContain('Mateo Silva');
    });

    await chooseFilter('All roles', 'Inventory Admin');
    await vi.waitFor(() => {
      expect(directory()?.textContent).toContain('No users match the selected filters.');
      expect(directory()?.textContent).not.toContain('Mateo Silva');
    });
  });

  it('keeps the generic CRUD table out of the default workspace until requested', async () => {
    await renderPage();
    expect(document.querySelector('[data-user-records]')).toBeNull();

    button('View records').click();

    await vi.waitFor(() => expect(document.querySelector('[data-user-records]')).not.toBeNull());
    expect(button('Hide records').getAttribute('aria-expanded')).toBe('true');
  });
});
