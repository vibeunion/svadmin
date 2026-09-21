import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it } from 'vitest';
import DesignPrinciplesPageTestHost from './design-principles-page.test-host.svelte';

afterEach(() => {
  cleanup();
});

describe('DesignPrinciplesPage enterprise composition', () => {
  it('renders UI package dashboard and approval components with example providers', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(DesignPrinciplesPageTestHost, { client, resourceName: 'design_principles' });

    const fixture = view.container.querySelector<HTMLElement>('[data-enterprise-component-fixture]');
    if (!fixture) throw new Error('enterprise component fixture is missing');
    expect(fixture.textContent).toContain('Enterprise component composition');

    await waitFor(() => {
      expect(fixture.textContent).toContain('Operations dashboard');
      expect(fixture.textContent).toContain('Approval demo');
      expect(fixture.textContent).toContain('Example purchase request');
    });

    const inputs = view.container.querySelector('[data-enterprise-input-fixture]');
    if (!inputs) throw new Error('enterprise input fixture is missing');
    expect(inputs.querySelector('input[type="range"]')).toBeTruthy();
    expect(inputs.querySelector('input[type="color"]')).toBeTruthy();
    expect(inputs.querySelector('input[type="date"]')).toBeTruthy();
    expect(inputs.querySelector('input[type="time"]')).toBeTruthy();
    expect(inputs.querySelector('input[type="datetime-local"]')).toBeTruthy();
    expect(inputs.querySelector('[role="radiogroup"]')).toBeTruthy();
    expect(inputs.querySelectorAll('[role="radio"]').length).toBeGreaterThan(0);
    expect(inputs.querySelector('fieldset')).toBeTruthy();
    expect(inputs.querySelector('[data-invalid]')).toBeNull();

    expect(view.container.querySelector('[data-resource-name="design_principles"]')).toBeTruthy();

    const errors = view.container.querySelector<HTMLElement>('[data-enterprise-error-fixture]');
    if (!errors) throw new Error('enterprise error fixture is missing');
    const errorRegion = errors.querySelector('[role="region"]');
    expect(errorRegion).toBeTruthy();
    const ownerError = Array.from(errorRegion?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.includes('Owner')) as HTMLButtonElement | undefined;
    if (!ownerError) throw new Error('owner error action is missing');
    ownerError.click();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe('demo-owner');
      expect(errors.querySelector('[data-focused-demo-field]')?.textContent).toContain('demo-owner');
    });
  });
});
