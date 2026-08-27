import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AutoFormAccessibilityHarness from '../../test/fixtures/AutoFormAccessibilityHarness.svelte';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('AutoForm layout and density', () => {
  it('renders form inputs within accessible form elements', async () => {
    const view = render(AutoFormAccessibilityHarness);
    const nameInput = await view.findByRole('textbox', { name: /^Name/ });
    expect(nameInput).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
