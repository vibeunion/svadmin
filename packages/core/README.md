# Schema Form Validation

Use the existing `useForm.validate` callback with a shared TypeBox schema:

```ts
import { Type, type Static } from '@sinclair/typebox';
import { createSchemaFormValidator, useForm } from '@svadmin/core';

const Input = Type.Object({
  title: Type.String({ minLength: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
});
type Input = Static<typeof Input>;

const form = useForm({
  resource: 'items',
  defaultValues: { title: '', quantity: 1 } satisfies Input,
  validate: createSchemaFormValidator(Input, {
    message: ({ path }) => path === '/quantity' ? 'Enter a positive integer' : 'Required',
  }),
});
```

Validation does not coerce or strip input. It returns `null` on success or the
first error per field. JSON Pointer paths map to dotted fields (`items.0.name`);
root errors map to `_form`. Use `field(pointer)` and `formField` when an
application uses another naming convention. `references` supports TypeBox refs.
Message callbacks receive only the path and error type, not submitted values.

This adapter prevents invalid form submissions through normal `useForm`
validation. Authorization, domain commands, and server validation remain the
application's responsibility. Root errors require a form-level error display.
