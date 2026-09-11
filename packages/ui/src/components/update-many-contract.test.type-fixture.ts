import { Type } from '@sinclair/typebox';
import { defineResource, useUpdateMany, type ResourceContract, type UseUpdateManyMutateParams } from '@svadmin/core';
import { parseUpdateManyParams } from '../../../core/src/update-many-contract';
const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  update: Type.Object({ title: Type.String() }),
});
const update = useUpdateMany({ resource: posts, enabled: true });
void update.mutation.mutateAsync({ ids: [1], variables: { title: 'Edited' } });
if (update.mutation.isSuccess) {
  for (const record of update.mutation.data.data) {
    const title: string = record.title;
    const id: number = record.id;
    void title;
    void id;
    // @ts-expect-error Receipt fields derive from the record schema.
    const invalid: boolean = record.title;
    void invalid;
  }
}
if (update.mutation.isError) {
  const code: string | undefined = update.mutation.error.code;
  void code;
  // @ts-expect-error Error states cannot promise success data.
  const data: { data: { id: number; title: string }[] } = update.mutation.data;
  void data;
}
if (update.mutation.isIdle) {
  const data: undefined = update.mutation.data;
  const error: null = update.mutation.error;
  void data;
  void error;
  // @ts-expect-error Idle state cannot contain success records.
  const records: { data: { id: number; title: string }[] } = update.mutation.data;
  void records;
}
const parsed = parseUpdateManyParams(posts, { ids: [1], variables: { title: 'Edited' } });
const title: string = parsed.variables.title;
void title;
type Schemas = typeof posts extends ResourceContract<infer S> ? S : never;
const params: UseUpdateManyMutateParams<Schemas> = { ids: [1], variables: { title: 'Edited' } };
void update.mutation.mutateAsync(params);
declare const dynamic: ResourceContract;
const dynamicUpdate = useUpdateMany({ resource: dynamic });
void dynamicUpdate.mutation.mutateAsync({ ids: [1], variables: { checkedAtRuntime: true } });
// @ts-expect-error Erased contracts cannot manufacture concrete payloads.
const fabricated: { title: string } = dynamicUpdate.mutation.variables?.variables;
void fabricated;
// @ts-expect-error Every update requires a payload.
void update.mutation.mutateAsync({ ids: [1] });
// @ts-expect-error IDs retain the schema type.
void update.mutation.mutateAsync({ ids: ['1'], variables: { title: 'Edited' } });
// @ts-expect-error Update payloads derive from the update schema.
void update.mutation.mutateAsync({ ids: [1], variables: { title: false } });
// @ts-expect-error Unknown input fields are rejected.
void update.mutation.mutateAsync({ ids: [1], variables: { title: 'Edited', extra: 1 } });
// @ts-expect-error Per-call resource overrides are forbidden.
void update.mutation.mutateAsync({ ids: [1], resource: 'other', variables: { title: 'Edited' } });
// @ts-expect-error Cache invalidation cannot be disabled.
void update.mutation.mutateAsync({ ids: [1], variables: { title: 'Edited' }, invalidates: false });
// @ts-expect-error Raw resource names are not contracts.
useUpdateMany({ resource: 'posts' });
// @ts-expect-error Caller-selected record types are not validation.
useUpdateMany<{ id: number; title: string }>({ resource: posts });
// @ts-expect-error Per-operation optimistic mode is not a checked lifecycle.
useUpdateMany({ resource: posts, mutationMode: 'optimistic' });
const readOnly = defineResource('readOnly', { record: Type.Object({ id: Type.Number() }) });
// @ts-expect-error Without an update schema there is no valid payload type.
void useUpdateMany({ resource: readOnly }).mutation.mutateAsync({ ids: [1], variables: {} });
