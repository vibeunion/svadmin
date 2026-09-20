import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { buttonVariants } from './button-variants';
import { uiButton } from '../../../styled-system/recipes/index.js';
import ButtonRefHarness from '../../../../test/fixtures/ButtonRefHarness.svelte';
import ButtonDisabledReasonHarness from '../../../../test/fixtures/ButtonDisabledReasonHarness.svelte';

describe('buttonVariants', () => {
	it('returns a stable primitive class instead of Tailwind utility classes', () => {
		const classes = buttonVariants({ variant: 'default' });

		expect(classes).toBe(`svadmin-button svadmin-button--default svadmin-button-size--default ${uiButton({ variant: 'default', size: 'default' })}`);
		expect(classes).not.toMatch(/(?:bg|text|hover|focus|rounded|inline-flex)-/);
	});

	it('does not encode variant behavior in utility classes', () => {
		for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const) {
			expect(buttonVariants({ variant })).toContain(`svadmin-button--${variant}`);
		}
	});

	it('preserves sizes and additional classes for class-only composition', () => {
		expect(buttonVariants({ variant: 'outline', size: 'sm', class: 'custom', className: 'extra' }))
			.toBe(`svadmin-button svadmin-button--outline svadmin-button-size--sm ${uiButton({ variant: 'outline', size: 'sm' })} custom extra`);
		expect(buttonVariants({ variant: null, size: null })).toBe(`svadmin-button ${uiButton()}`);
	});

	it('binds the actual element when switching between button and link', async () => {
		const { rerender } = render(ButtonRefHarness);
		await waitFor(() => expect(screen.getByTestId('bound-button-tag').textContent).toBe('BUTTON'));
		expect(screen.getByRole('button', { name: 'Reference action' })).not.toBeNull();
		await rerender({ href: '/destination' });
		await waitFor(() => expect(screen.getByTestId('bound-button-tag').textContent).toBe('A'));
		expect(screen.getByRole('link', { name: 'Reference action' }).getAttribute('href')).toBe('/destination');
		await rerender({ href: '' });
		await waitFor(() => expect(screen.getByTestId('bound-button-tag').textContent).toBe('BUTTON'));
	});
});

describe('disabledReason', () => {
	it('names the focusable restriction and accepts parent layout attributes', () => {
		render(ButtonDisabledReasonHarness, {
			props: {
				disabledReason: 'Frozen', ariaLabel: 'Submit order',
				restrictionClass: 'flex-1', restrictionStyle: 'grid-column: span 2;',
			},
		});
		const wrapper = screen.getByRole('group', { name: 'Submit order' });
		expect(wrapper.classList.contains('flex-1')).toBe(true);
		expect(wrapper.style.gridColumn).toBe('span 2');
		expect(wrapper.tabIndex).toBe(0);
	});

	it('blocks link callbacks until the restriction is removed', async () => {
		const onclick = vi.fn();
		const { rerender } = render(ButtonDisabledReasonHarness, {
			props: { href: '#submit', disabledReason: 'Frozen', onclick },
		});
		const link = screen.getByRole('link', { name: 'Command action' });
		expect(link.hasAttribute('href')).toBe(false);
		await fireEvent.click(link);
		expect(onclick).not.toHaveBeenCalled();
		await rerender({ href: '#submit', disabledReason: '', onclick });
		const enabled = screen.getByRole('link', { name: 'Command action' });
		expect(enabled.getAttribute('href')).toBe('#submit');
		await fireEvent.click(enabled);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('keeps explicitly disabled links blocked without a reason', async () => {
		const onclick = vi.fn();
		render(ButtonDisabledReasonHarness, { props: { href: '#submit', disabled: true, onclick } });
		await fireEvent.click(screen.getByRole('link', { name: 'Command action' }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it('exposes the restriction on keyboard focus', async () => {
		render(ButtonDisabledReasonHarness, { props: { disabledReason: 'Frozen' } });
		const wrapper = screen.getByRole('button', { name: 'Command action' })
			.closest<HTMLElement>('[data-slot="button-restriction"]');
		expect(wrapper?.tabIndex).toBe(0);
		wrapper?.focus();
		expect((await screen.findByRole('tooltip')).textContent?.trim()).toBe('Frozen');
	});

	it('leaves an empty reason enabled and does not wrap or leak the prop', () => {
		render(ButtonDisabledReasonHarness, { props: { disabledReason: '   ' } });
		const button = screen.getByRole('button', { name: 'Command action' });
		expect(button.hasAttribute('disabled')).toBe(false);
		expect(button.getAttribute('disabledreason')).toBeNull();
		expect(button.getAttribute('disabledReason')).toBeNull();
		expect(button.closest('[data-slot="button-restriction"]')).toBeNull();
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	it('disables a blocked command and exposes the reason on hover', async () => {
		const reason = 'Order is frozen；unfreeze it before submitting';
		render(ButtonDisabledReasonHarness, { props: { disabledReason: reason } });
		const button = screen.getByRole('button', { name: 'Command action' });
		expect(button.hasAttribute('disabled')).toBe(true);
		expect(button.getAttribute('disabledreason')).toBeNull();
		const wrapper = button.closest('[data-slot="button-restriction"]');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute('data-disabled-reason')).toBe(reason);
		expect(document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent).toBe(reason);
		await fireEvent.pointerEnter(wrapper as HTMLElement, { pointerType: 'mouse' });
		expect((await screen.findByRole('tooltip')).textContent?.trim()).toBe(reason);
	});
});
