import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Host from './config-provider-defaults.test-host.svelte';

afterEach(() => cleanup());

describe('ConfigProvider app defaults', () => {
  it('pushes component, empty, pagination and popup defaults into consumers', async () => {
    const view = render(Host, {
      componentSize: 'sm',
      componentDefaults: {
        Button: { variant: 'outline', size: 'lg' },
        Empty: { title: 'From component', description: 'Component description' },
        Pagination: { showJumper: true },
      },
      empty: { title: 'From empty', description: 'Nothing yet' },
      pagination: { pageSize: 25 },
      popupTarget: 'a',
    });

    expect(screen.getByRole('heading', { name: 'From empty' })).toBeTruthy();
    expect(screen.getByText('Nothing yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Action' }).getAttribute('data-variant')).toBe('outline');
    expect(screen.getByRole('button', { name: 'Action' }).getAttribute('data-size')).toBe('lg');
    expect(screen.getByTestId('page-size').textContent).toBe('25');
    expect(screen.getByLabelText('Records page number')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(menu).toBeTruthy();
    expect(view.container.querySelector('[data-testid="popup-a"]')?.contains(menu ?? null)).toBe(true);
    expect(view.container.querySelector('[data-testid="popup-b"]')?.contains(menu ?? null)).toBe(false);

    await view.rerender({
      componentSize: 'sm',
      componentDefaults: {
        Button: { variant: 'ghost' },
        Empty: { title: 'From component', description: 'Component description' },
        Pagination: { showJumper: true },
      },
      empty: { description: 'Still empty' },
      pagination: { pageSize: 50, showJumper: false },
      popupTarget: 'b',
    });

    expect(screen.getByRole('heading', { name: 'From component' })).toBeTruthy();
    expect(screen.getByText('Still empty')).toBeTruthy();
    expect(screen.queryByText('Nothing yet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Action' }).getAttribute('data-variant')).toBe('ghost');
    expect(screen.getByRole('button', { name: 'Action' }).getAttribute('data-size')).toBe('sm');
    expect(screen.getByTestId('page-size').textContent).toBe('50');
    expect(screen.queryByLabelText('Records page number')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const moved = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(view.container.querySelector('[data-testid="popup-b"]')?.contains(moved ?? null)).toBe(true);
    expect(view.container.querySelector('[data-testid="popup-a"]')?.contains(moved ?? null)).toBe(false);
  });
});
