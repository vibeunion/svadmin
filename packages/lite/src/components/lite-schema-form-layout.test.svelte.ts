import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteJsonSchemaForm from './LiteJsonSchemaForm.svelte';

afterEach(cleanup);

describe('lite schema form layout', () => {
  it('groups sections the same way as the schema layout plan', () => {
    const view = render(LiteJsonSchemaForm, {
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name', layout: { type: 'section', title: 'Identity' } },
          email: { type: 'string', title: 'Email', layout: { type: 'section', title: 'Identity' } },
          plan: { type: 'string', title: 'Plan', layout: { type: 'section', title: 'Billing', description: 'Invoice details' } },
        },
      },
    });
    expect(view.getByText('Identity')).toBeTruthy();
    expect(view.getByText('Billing')).toBeTruthy();
    expect(view.getByText('Invoice details')).toBeTruthy();
    const groups = view.container.querySelectorAll('[data-svadmin-form-group]');
    expect(groups).toHaveLength(2);
    expect(groups[0]?.textContent).toContain('Name');
    expect(groups[1]?.textContent).toContain('Plan');
  });
});
