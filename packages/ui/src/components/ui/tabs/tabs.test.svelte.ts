import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import TabsHarness from '../../../../test/fixtures/TabsHarness.svelte';
import TabsOptionsHarness from '../../../../test/fixtures/TabsOptionsHarness.svelte';

describe('Tabs', () => {
	it('keeps trigger state, content, bindings, and callbacks in sync', async () => {
		render(TabsHarness);

		const stateTab = screen.getByRole('tab', { name: 'State' });
		const inferencerTab = screen.getByRole('tab', { name: 'Inferencer' });

		expect(stateTab.getAttribute('aria-selected')).toBe('true');
		expect(inferencerTab.getAttribute('aria-selected')).toBe('false');
		expect(screen.getByText('State panel')).toBeTruthy();
		expect(screen.queryByText('Inferencer panel')).toBeNull();

		await fireEvent.click(inferencerTab);

		expect(stateTab.getAttribute('aria-selected')).toBe('false');
		expect(inferencerTab.getAttribute('aria-selected')).toBe('true');
		expect(screen.queryByText('State panel')).toBeNull();
		expect(screen.getByText('Inferencer panel')).toBeTruthy();
		expect(screen.getByTestId('tabs-value').textContent).toBe('inferencer');
		expect(screen.getByTestId('tabs-changes').textContent).toBe('inferencer');
	});

	it('supports roving focus and keyboard activation', async () => {
		render(TabsHarness);

		const stateTab = screen.getByRole('tab', { name: 'State' });
		const inferencerTab = screen.getByRole('tab', { name: 'Inferencer' });

		stateTab.focus();
		await fireEvent.keyDown(stateTab, { key: 'ArrowRight' });

		expect(document.activeElement).toBe(inferencerTab);
		expect(inferencerTab.getAttribute('aria-selected')).toBe('true');
		expect(screen.getByText('Inferencer panel')).toBeTruthy();

		await fireEvent.keyDown(inferencerTab, { key: 'Home' });
		expect(document.activeElement).toBe(stateTab);
		expect(stateTab.getAttribute('aria-selected')).toBe('true');
	});

	it('supports activeTab, direction, size, destroyOnHide false, and disabled triggers', async () => {
		render(TabsOptionsHarness);

		const tablist = screen.getByRole('tablist');
		expect(tablist.getAttribute('aria-orientation')).toBe('vertical');
		expect(tablist.getAttribute('data-size')).toBe('small');

		const firstTab = screen.getByRole('tab', { name: 'First' });
		const secondTab = screen.getByRole('tab', { name: 'Second' });
		const disabledTab = screen.getByRole('tab', { name: 'Disabled' });

		expect(firstTab.getAttribute('aria-selected')).toBe('true');
		expect(secondTab.getAttribute('aria-selected')).toBe('false');
		expect(disabledTab.hasAttribute('disabled')).toBe(true);

		// With destroyOnHide={false}, inactive tabs remain in DOM with style="display: none;"
		const firstContent = screen.getByText('First content');
		const secondContent = screen.getByText('Second content');
		expect(firstContent.style.display).toBe('');
		expect(secondContent.style.display).toBe('none');

		// Click disabled tab does not change tab
		await fireEvent.click(disabledTab);
		expect(screen.getByTestId('active-tab').textContent).toBe('tab1');

		// Click second tab updates activeTab and invokes onChange
		await fireEvent.click(secondTab);
		expect(screen.getByTestId('active-tab').textContent).toBe('tab2');
		expect(screen.getByTestId('active-changes').textContent).toBe('tab2');
		expect(secondTab.getAttribute('aria-selected')).toBe('true');
		expect(firstTab.getAttribute('aria-selected')).toBe('false');
		expect(firstContent.style.display).toBe('none');
		expect(secondContent.style.display).toBe('');
	});
});
