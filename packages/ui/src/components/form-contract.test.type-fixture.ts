import { Type } from '@sinclair/typebox';
import { defineResource, useForm, type ResourceContract } from '@svadmin/core';
// @ts-expect-error The dynamic form implementation has been retired.
import { createForm } from '../../../core/src/form-hooks.svelte';
// @ts-expect-error Internal barrels cannot expose the old dynamic form.
import { useForm as legacyForm } from '../../../core/src/hooks.svelte';
// @ts-expect-error Dynamic modal wrappers cannot bypass resource contracts.
import { useModalForm, useDrawerForm } from '../../../core/src/utility-hooks.svelte';
void createForm;
void legacyForm;
void useModalForm;
void useDrawerForm;

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number(), serverOnly: Type.String() }),
  create: Type.Object({ title: Type.String(), quantity: Type.Number() }),
  update: Type.Object({ title: Type.Optional(Type.String()), quantity: Type.Optional(Type.Number()) }),
});
const form = useForm({ resource: posts, action: 'create', defaultValues: {} });
form.setFieldValue('title', 'Draft');
form.setFieldValue('quantity', 2);
form.setValues({ title: 'Bulk draft' });
form.setFieldError('title', 'Required');
form.setFieldError('_root', 'Invalid');
// @ts-expect-error Error field names come from the input schema.
form.setFieldError('serverOnly', 'Invalid');
// @ts-expect-error Error maps are detached read-only views.
form.errors['title'] = 'Changed';
// @ts-expect-error Taint maps are detached read-only views.
form.tainted['title'] = false;
const draft: unknown = form.values.title;
void draft;
// @ts-expect-error A draft is not proof of a validated payload.
const fabricated: string = form.values.title;
void fabricated;
// @ts-expect-error Draft values are updated through checked setters.
form.values.title = 'direct mutation';
// @ts-expect-error Field setters retain concrete schema value types.
form.setFieldValue('quantity', '2');
// @ts-expect-error Server-only fields do not belong to the create input.
form.setFieldValue('serverOnly', 'privileged');
// @ts-expect-error Field names come from the input schema.
form.setValues({ invented: true });
// @ts-expect-error Default values use the concrete input type.
useForm({ resource: posts, action: 'create', defaultValues: { quantity: '2' } });
// @ts-expect-error A target cannot be silently taken from the router.
useForm({ resource: posts, action: 'edit' });
// @ts-expect-error Record IDs derive from the schema.
useForm({ resource: posts, action: 'show', id: '1' });
// @ts-expect-error Create forms cannot target an existing record ID.
useForm({ resource: posts, action: 'create', id: 1 });
// @ts-expect-error Raw resource names are not contracts.
useForm({ resource: 'posts', action: 'create' });
// @ts-expect-error Arbitrary retry policy cannot duplicate a write.
useForm({ resource: posts, action: 'create', createMutationOptions: { retry: 3 } });
// @ts-expect-error Provider mutation functions cannot replace the checked boundary.
useForm({ resource: posts, action: 'edit', id: 1, updateMutationOptions: { mutationFn: async () => ({ data: {} }) } });
// @ts-expect-error Unchecked optimistic modes are not exposed.
void form.mutationMode;
// @ts-expect-error Bound action and ID cannot be replaced through escape hatches.
form.setAction('edit');
// @ts-expect-error Bound ID cannot be replaced through escape hatches.
form.setId(2);
// @ts-expect-error A missing create schema is not an empty writable form.
useForm({ resource: defineResource('readonly', { record: Type.Object({ id: Type.Number() }) }), action: 'create' });
const readonly = defineResource('readonly', { record: Type.Object({ id: Type.Number() }) });
useForm({ resource: readonly, action: 'show', id: 1 });
useForm({ resource: posts, action: 'clone', id: 1 });
declare const metadata: ResourceContract;
useForm({ resource: metadata, action: 'edit', id: 1 }).setFieldValue('runtimeChecked', false);
async function checkedReceipt() {
  const result = await form.submit();
  const title: string = result.data.title;
  const id: number = result.data.id;
  void title;
  void id;
  // @ts-expect-error Checked result fields cannot be caller-selected.
  const invalid: boolean = result.data.quantity;
  void invalid;
}
void checkedReceipt;
