import { expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { createSchemaFormValidator } from './schema-form';

test('maps required, nested and array errors without coercion', () => {
  const schema = Type.Object({
    name: Type.String({ minLength: 1 }),
    items: Type.Array(Type.Object({ amount: Type.Integer({ minimum: 0 }) })),
  });
  const values = { items: [{ amount: 'private value' }] };
  const before = structuredClone(values);
  const validate = createSchemaFormValidator(schema, { message: ({ path }) => `Invalid: ${path}` });
  expect(validate(values)).toEqual({ name: 'Invalid: /name', 'items.0.amount': 'Invalid: /items/0/amount' });
  expect(values).toEqual(before);
  expect(validate({ name: 'item', items: [{ amount: 0 }] })).toBeNull();
});

test('supports references and custom field paths without passing private values', () => {
  const amount = Type.Integer({ $id: 'Amount', minimum: 1 });
  const issues: unknown[] = [];
  const validate = createSchemaFormValidator(Type.Object({ 'a/b~c': Type.Ref(amount) }), {
    references: [amount], field: (pointer) => pointer,
    message: (issue) => { issues.push(issue); return 'Invalid amount'; },
  });
  expect(validate({ 'a/b~c': 0 })).toEqual({ '/a~1b~0c': 'Invalid amount' });
  expect(issues[0]).not.toHaveProperty('value');
  expect(issues[0]).not.toHaveProperty('schema');
});

test('handles root and prototype-like fields safely and keeps first message', () => {
  const validate = createSchemaFormValidator(Type.Object({ constructor: Type.Integer() }));
  const errors = validate({ constructor: 'private' });
  expect(errors).not.toBeNull();
  if (!errors) throw new Error('expected validation errors');
  expect(Object.hasOwn(errors, 'constructor')).toBe(true);
  expect(Object.values(errors)).toEqual(['Invalid value']);
  expect(Object.getPrototypeOf(errors)).toBeNull();
  expect(validate(null)).toEqual({ _form: 'Invalid value' });
});
