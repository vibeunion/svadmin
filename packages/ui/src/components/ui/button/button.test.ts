import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { buttonVariants } from './button-variants';
import ButtonRefHarness from '../../../../test/fixtures/ButtonRefHarness.svelte';

describe('buttonVariants', () => {
	it('returns a stable primitive class instead of Tailwind utility classes', () => {
		const classes = buttonVariants({ variant: 'default' });

		expect(classes).toBe('svadmin-button svadmin-button--default svadmin-button-size--default');
		expect(classes).not.toMatch(/(?:bg|text|hover|focus|rounded|inline-flex)-/);
	});

	it('does not encode variant behavior in utility classes', () => {
		for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const) {
			expect(buttonVariants({ variant })).toContain(`svadmin-button--${variant}`);
		}
	});

	it('preserves sizes and additional classes for class-only composition', () => {
		expect(buttonVariants({ variant: 'outline', size: 'sm', class: 'custom', className: 'extra' }))
			.toBe('svadmin-button svadmin-button--outline svadmin-button-size--sm custom extra');
		expect(buttonVariants({ variant: null, size: null })).toBe('svadmin-button');
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
