import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LiteErrorSummary from './LiteErrorSummary.svelte';

describe('LiteErrorSummary', () => {
  it('renders no region for an empty error list', () => {
    const view = render(LiteErrorSummary, { errors: [] });
    expect(view.container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders static errors and native anchors without client handlers', () => {
    const view = render(LiteErrorSummary, {
      title: 'Please fix the following errors',
      errors: [
        { fieldKey: 'name', fieldId: 'name', label: 'Name', message: 'Required' },
        { fieldKey: 'owner', label: 'Owner', message: 'Required' },
      ],
    });

    const region = view.getByRole('region', { name: 'Please fix the following errors' });
    expect(region.querySelector('a[href="#name"]')?.textContent).toContain('Name: Required');
    expect(region.querySelector('button')).toBeNull();
    expect(region.textContent).toContain('Owner: Required');
  });
});
