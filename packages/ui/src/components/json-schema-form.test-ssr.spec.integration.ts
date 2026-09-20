import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import JsonSchemaForm from './JsonSchemaForm.svelte';
import LiteJsonSchemaForm from '../../../lite/src/components/LiteJsonSchemaForm.svelte';
import { decodeSchemaFormData, type SchemaFormSchema } from '../../../lite/src/schema-form-data';

const schema: SchemaFormSchema = { properties: {
  count: { type: 'number', default: 7 },
  flag: { type: 'boolean', default: true },
  choice: { enum: [null, 'null', 2, '2'], default: null },
  rows: { type: 'array', default: [{}], items: { type: 'object', properties: { name: { default: 'default' } } } },
} };

describe('JSON Schema forms without hydration', () => {
  it('renders and decodes native defaults, enums, booleans and array items without effects', async () => {
    const { body } = render(LiteJsonSchemaForm, { props: { schema, action: '/save' } });
    const window = new Window();
    try {
      window.document.body.innerHTML = body;
      const form = window.document.querySelector('form');
      if (!form) throw new Error('Expected form');
      const native = new window.FormData(form);
      const data = new FormData();
      for (const [key, value] of native.entries()) {
        if (typeof value !== 'string') throw new Error('Unexpected file');
        data.append(key, value);
      }
      expect(decodeSchemaFormData(schema, data)).toEqual({
        count: 7, flag: true, choice: null, rows: [{ name: 'default' }],
      });
      expect(body).not.toContain('<script');
    } finally {
      await window.happyDOM.close();
    }
  });

  it('renders SPA defaults without relying on browser-only effects', () => {
    const { body } = render(JsonSchemaForm, { props: { schema } });
    expect(body).toContain('value="7"');
    expect(body).toContain('value="default"');
  });
});
