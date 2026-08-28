import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import * as NavigationMenu from './index.js';
import NavigationMenuHarness from '../../../../test/fixtures/NavigationMenuHarness.svelte';

describe('NavigationMenu', () => {
	it('exports all expected primitive wrappers', () => {
		expect(NavigationMenu.Root).toBeDefined();
		expect(NavigationMenu.List).toBeDefined();
		expect(NavigationMenu.Item).toBeDefined();
		expect(NavigationMenu.Trigger).toBeDefined();
		expect(NavigationMenu.Content).toBeDefined();
		expect(NavigationMenu.Link).toBeDefined();
		expect(NavigationMenu.Viewport).toBeDefined();
		expect(NavigationMenu.Indicator).toBeDefined();
	});

	it('renders navigation menu with items, triggers, and links', () => {
		render(NavigationMenuHarness);

		expect(screen.getByRole('button', { name: /products/i })).toBeDefined();
		expect(screen.getByRole('link', { name: /pricing/i })).toBeDefined();
		expect(screen.getByTestId('nav-value').textContent).toBe('products');
	});
});
