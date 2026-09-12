import { Type } from '@sinclair/typebox';
import { defineResource, useCreateMany, type ResourceContract, type UseCreateManyMutateParams } from '@svadmin/core';
import { parseCreateManyParams } from '../../../core/src/create-many-contract';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  create: Type.Object({ title: Type.String() }),
});
const create = useCreateMany({ resource: posts, enabled: true });
void create.mutation.mutateAsync({ variables: [{ title: 'Created' }] });
if (create.mutation.isSuccess) {
  for (const record of create.mutation.data.data) {
    const title: string = record.title;
    const id: number = record.id;
    void title;
    void id;
    // @ts-expect-error Receipt fields derive from the record schema.
    const invalid: boolean = record.title;
    void invalid;
  }
}
if (create.mutation.isError) {
  const code: string | undefined = create.mutation.error.code;
  void code;
  // @ts-expect-error Error states cannot promise success data.
  const data: { data: { id: number; title: string }[] } = create.mutation.data;
  void data;
}
if (create.mutation.isIdle) {
  const data: undefined = create.mutation.data;
  const error: null = create.mutation.error;
  void data;
  void error;
  // @ts-expect-error Idle state cannot contain success records.
  const records: { data: { id: number; title: string }[] } = create.mutation.data;
  void records;
}
const parsed = parseCreateManyParams(posts, { variables: [{ title: 'Created' }] });
const title: string | undefined = parsed.variables[0]?.title;
void title;
type Schemas = typeof posts extends ResourceContract<infer S> ? S : never;
const params: UseCreateManyMutateParams<Schemas> = { variables: [{ title: 'Created' }] };
void create.mutation.mutateAsync(params);
declare const dynamic: ResourceContract;
const dynamicCreate = useCreateMany({ resource: dynamic });
void dynamicCreate.mutation.mutateAsync({ variables: [{ checkedAtRuntime: true }] });
// @ts-expect-error Erased contracts cannot manufacture concrete payloads.
const fabricated: { title: string } = dynamicCreate.mutation.variables?.variables[0];
void fabricated;
// @ts-expect-error Every create requires a payload array.
void create.mutation.mutateAsync({});
// @ts-expect-error Create payloads derive from the create schema.
void create.mutation.mutateAsync({ variables: [{ title: false }] });
// @ts-expect-error Every member is checked.
void create.mutation.mutateAsync({ variables: [{ title: 'Valid' }, { title: 5 }] });
// @ts-expect-error Unknown input fields are rejected.
void create.mutation.mutateAsync({ variables: [{ title: 'Created', extra: 1 }] });
// @ts-expect-error Per-call resource overrides are forbidden.
void create.mutation.mutateAsync({ resource: 'other', variables: [{ title: 'Created' }] });
// @ts-expect-error Cache invalidation cannot be disabled.
void create.mutation.mutateAsync({ variables: [{ title: 'Created' }], invalidates: false });
// @ts-expect-error Raw resource names are not contracts.
useCreateMany({ resource: 'posts' });
// @ts-expect-error Caller-selected record types are not validation.
useCreateMany<{ id: number; title: string }>({ resource: posts });
// @ts-expect-error Retry is not a caller-selectable create policy.
useCreateMany({ resource: posts, retry: 3 });
const readOnly = defineResource('readOnly', { record: Type.Object({ id: Type.Number() }) });
// @ts-expect-error Without a create schema there is no valid payload type.
void useCreateMany({ resource: readOnly }).mutation.mutateAsync({ variables: [{}] });
// @ts-expect-error Missing schemas must also reject the never[] loophole.
void useCreateMany({ resource: readOnly }).mutation.mutateAsync({ variables: [] });
declare const readOnlyContract: typeof readOnly;
// @ts-expect-error A selected read-only target cannot accept a payload.
void useCreateMany({ resource: Math.random() ? posts : readOnlyContract }).mutation.mutateAsync({ variables: [{ title: 'Created' }] });
const categories = defineResource('categories', {
  record: Type.Object({ id: Type.String(), name: Type.String() }), create: Type.Object({ name: Type.String() }),
});
const selected = Math.random() ? create : useCreateMany({ resource: categories });
// @ts-expect-error A selected mutation cannot accept only one possible target's input.
void selected.mutation.mutateAsync({ variables: [{ title: 'Created' }] });
