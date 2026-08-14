import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import CommandHarness from '../../../../test/fixtures/CommandHarness.svelte';

describe('Command', () => {
	it('filters groups, exposes state attributes, and selects the resolved item value', async () => {
		const { container } = render(CommandHarness);

		expect(screen.getByText('Navigation')).toBeTruthy();
		const disabledItem = screen.getByText('Disabled command').closest('[data-command-item]');
		expect(disabledItem?.hasAttribute('data-disabled')).toBe(true);

		const input = screen.getByRole('combobox', { name: 'Actions' });
		await fireEvent.input(input, { target: { value: 'settings' } });

		await waitFor(() => {
			expect(screen.queryByText('Dashboard')).toBeNull();
		});

		const settingsItem = screen.getByText('Settings').closest('[data-command-item]');
		expect(settingsItem).toBeTruthy();
		expect(settingsItem?.hasAttribute('data-selected')).toBe(true);
		if (!settingsItem) throw new Error('Settings command item was not rendered');
		await fireEvent.click(settingsItem);
		expect(screen.getByTestId('selected-command').textContent).toBe('settings');

		await fireEvent.input(input, { target: { value: 'missing' } });
		await waitFor(() => {
			expect(screen.getByText('No commands found.')).toBeTruthy();
		});

		await fireEvent.input(input, { target: { value: '' } });
		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		const keyboardItem = container.querySelector<HTMLElement>('[data-command-item][data-selected]');
		expect(keyboardItem).toBeTruthy();
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(screen.getByTestId('selected-command').textContent).toBe(keyboardItem?.dataset.value);
	});

	it('keeps the dialog, loading, separator, and selected-value API compatible', async () => {
		const { unmount } = render(CommandHarness, { props: { dialog: true } });

		const input = screen.getByRole('combobox', { name: 'Dialog actions' });
		expect(screen.getByRole('progressbar', { name: 'Loading...' }).getAttribute('aria-valuenow')).toBe('50');
		expect(document.querySelector('[data-cmdk-dialog]')).toBeTruthy();
		expect(document.querySelector('[data-cmdk-separator]')).toBeTruthy();

		await fireEvent.input(input, { target: { value: 'settings' } });
		expect(document.querySelector('[data-cmdk-separator]')).toBeTruthy();
		const item = await screen.findByText('Dialog settings');
		await fireEvent.click(item);

		expect(screen.getByTestId('selected-command').textContent).toBe('dialog-settings');
		expect(screen.getByTestId('dialog-value').textContent).toBe('dialog-settings');

		unmount();
	});
});
