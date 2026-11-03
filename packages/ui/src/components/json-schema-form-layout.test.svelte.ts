import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import JsonSchemaForm from './JsonSchemaForm.svelte';
import type { JsonSchemaFormSchema } from './json-schema-form-state.js';

const sectioned: JsonSchemaFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', layout: { type: 'section', title: 'Identity' } },
    email: { type: 'string', title: 'Email', layout: { type: 'section', title: 'Identity' } },
    plan: { type: 'string', title: 'Plan', layout: { type: 'section', title: 'Billing', description: 'Invoice details' } },
  },
};

const twoColumn: JsonSchemaFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', layout: { type: 'grid', columns: 2 } },
    code: { type: 'string', title: 'Code', layout: { type: 'grid', columns: 2, span: 2 } },
  },
};

afterEach(cleanup);

describe('schema form declarative layout', () => {
  it('renders section groups with their titles and descriptions', () => {
    const view = render(JsonSchemaForm, { schema: sectioned, locale: 'en-US', onsubmit: () => {} });
    expect(view.getByText('Identity')).toBeTruthy();
    expect(view.getByText('Billing')).toBeTruthy();
    expect(view.getByText('Invoice details')).toBeTruthy();
    const groups = view.container.querySelectorAll('[data-svadmin-form-group]');
    expect(groups).toHaveLength(2);
    expect(groups[0]?.textContent).toContain('Name');
    expect(groups[1]?.textContent).toContain('Plan');
  });

  it('applies grid columns without changing field names', () => {
    const view = render(JsonSchemaForm, { schema: twoColumn, locale: 'en-US', onsubmit: () => {} });
    const group = view.container.querySelector('[data-svadmin-form-group]');
    expect(group?.className).toContain('md:grid-cols-2');
    expect(view.getByLabelText('Name')).toBeTruthy();
    expect(view.getByLabelText('Code')).toBeTruthy();
  });

  it('keeps the flat layout when no layout keyword is declared', () => {
    const view = render(JsonSchemaForm, {
      schema: { type: 'object', properties: { a: { type: 'string', title: 'A' } } },
      locale: 'en-US',
      onsubmit: () => {},
    });
    const group = view.container.querySelector('[data-svadmin-form-group]');
    expect(group?.className).toContain('space-y-3.5');
    expect(view.queryByRole('heading')).toBeNull();
  });
});