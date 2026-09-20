import { describe, expect, it } from 'vitest';
import { decodeSchemaFormData, schemaFormFieldName } from './schema-form-data';

describe('schema form server decoder', () => {
  const schema = {
    properties: {
      count: { type: 'integer', default: 1 },
      enabled: { type: 'boolean', default: false },
      choice: { enum: [2, '2'] },
      rows: { type: 'array', items: { type: 'string' } },
    },
  };

  it('accepts typed values and repeated array indexes', () => {
    const form = new FormData();
    form.set(schemaFormFieldName(['count']), '3');
    form.set(schemaFormFieldName(['enabled']), 'false');
    form.set(schemaFormFieldName(['choice']), '__json_enum_1');
    form.set('length:["rows"]', '2');
    form.set(schemaFormFieldName(['rows', '0']), 'a');
    form.set(schemaFormFieldName(['rows', '1']), 'b');
    expect(decodeSchemaFormData(schema, form)).toEqual({
      count: 3, enabled: false, choice: '2', rows: ['a', 'b'],
    });
  });

  it.each([
    ['duplicate scalar', (form: FormData) => form.append(schemaFormFieldName(['count']), '4')],
    ['invalid number', (form: FormData) => form.set(schemaFormFieldName(['count']), '1.2')],
    ['unknown field', (form: FormData) => form.set('data:[\"private\"]', 'secret')],
    ['unbounded array', (form: FormData) => form.set('length:[\"rows\"]', '1001')],
  ])('rejects %s', (_name, mutate) => {
    const form = new FormData();
    form.set(schemaFormFieldName(['count']), '3');
    form.set(schemaFormFieldName(['enabled']), 'false');
    form.set(schemaFormFieldName(['choice']), '__json_enum_0');
    form.set('length:["rows"]', '0');
    mutate(form);
    expect(() => decodeSchemaFormData(schema, form)).toThrow('Invalid schema form data.');
  });
});
