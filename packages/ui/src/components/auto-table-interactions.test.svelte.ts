import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AutoTableInteractionsHarness from '../../test/fixtures/AutoTableInteractionsHarness.svelte';

beforeEach(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    } satisfies Partial<Storage>,
  });
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AutoTable interactions', () => {
  it('uses the active locale for built-in table labels', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en',
      onNavigate: vi.fn(),
    });

    expect(await view.findByRole('button', { name: 'Columns' })).toBeTruthy();
    expect(await view.findByPlaceholderText('Search...')).toBeTruthy();
  });

  it('updates external column visibility state after a picker click', async () => {
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    await fireEvent.click(await view.findByRole('button', { name: '列' }));
    const emailColumn = await view.findByRole('menuitemcheckbox', { name: 'Email' });
    expect(emailColumn.getAttribute('aria-checked')).toBe('true');
    expect(view.getAllByText('user@example.com')).toHaveLength(2);

    await fireEvent.click(emailColumn);

    await waitFor(() => {
      expect(view.getByRole('menuitemcheckbox', { name: 'Email' }).getAttribute('aria-checked')).toBe('false');
      expect(view.queryByRole('columnheader', { name: 'Email' })).toBeNull();
      expect(view.queryByText('user@example.com')).toBeNull();
    });
  });

  it('waits for a pause before synchronizing a search with the router', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate });
    const searchInput = await view.findByPlaceholderText('搜索...');

    searchInput.focus();
    await fireEvent.input(searchInput, { target: { value: 'u' } });
    await fireEvent.input(searchInput, { target: { value: 'user' } });
    expect(onNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith({
        to: '/',
        query: { q: 'user' },
        type: 'replace',
      });
    });
    expect(document.activeElement).toBe(searchInput);
  });

  it('applies a persisted column order after the table mounts', async () => {
    localStorage.setItem('svadmin-colorder-users', JSON.stringify(['email', 'id']));
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    await waitFor(() => {
      const headings = view.getAllByRole('columnheader').map((heading) => heading.textContent?.trim());
      expect(headings.findIndex((heading) => heading?.startsWith('Email')))
        .toBeLessThan(headings.findIndex((heading) => heading?.startsWith('ID')));
    });
  });

  it('renders expanded-row content after toggling the localized action', async () => {
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });

    const expandButton = await view.findByRole('button', { name: '展开' });
    await fireEvent.click(expandButton);
    expect(await view.findByRole('button', { name: '收起' })).toBeTruthy();
    expect(await view.findByText('已展开：user@example.com')).toBeTruthy();

    await fireEvent.click(await view.findByRole('button', { name: '收起' }));
    await waitFor(() => {
      expect(view.queryByText('已展开：user@example.com')).toBeNull();
    });
  });

  it('does not expose detail navigation for a resource that disables show actions', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, { onNavigate, canShow: false });

    const [email] = await view.findAllByText('user@example.com');
    if (!email) throw new Error('Expected the desktop row email cell');
    await fireEvent.contextMenu(email);

    expect(await view.findByText('复制 ID')).not.toBeNull();
    await waitFor(() => {
      expect(view.queryByText('详情')).toBeNull();
      expect(view.queryByRole('button', { name: '详情' })).toBeNull();
    });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('fails closed when access control rejects the show action', async () => {
    const view = render(AutoTableInteractionsHarness, {
      onNavigate: vi.fn(),
      canShow: true,
      showAllowed: false,
    });

    const [email] = await view.findAllByText('user@example.com');
    if (!email) throw new Error('Expected the desktop row email cell');
    await fireEvent.contextMenu(email);

    expect(await view.findByText('复制 ID')).not.toBeNull();
    expect(view.queryByText('详情')).toBeNull();
    expect(view.queryByRole('button', { name: '详情' })).toBeNull();
  });

  it('navigates to detail when both resource and access control allow show', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      onNavigate,
      canShow: true,
      showAllowed: true,
    });

    const [email] = await view.findAllByText('user@example.com');
    if (!email) throw new Error('Expected the desktop row email cell');
    await fireEvent.contextMenu(email);
    await fireEvent.click(await view.findByText('详情'));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({
      to: '/users/show/user-1',
      type: 'push',
    }));
  });
});
