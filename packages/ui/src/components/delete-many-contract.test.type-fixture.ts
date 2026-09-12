import { Type } from '@sinclair/typebox';
import { defineResource, useDeleteMany, type ContractSchemas, type ResourceContract,
  type UseDeleteManyOptions, type UseDeleteManyMutateParams } from '@svadmin/core';
import * as legacy from '../../../core/src/hooks.svelte';
const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const remove = useDeleteMany({ resource: posts });
remove.mutation.mutate({ ids: [1, 2] });
const requestedIds: number[] | undefined = remove.mutation.variables?.ids;
void requestedIds;
if (remove.mutation.isSuccess) {
  const checkedRows: { id: number; title: string }[] = remove.mutation.data.data;
  void checkedRows;
}
if (remove.mutation.isIdle) {
  const data: undefined = remove.mutation.data;
  const error: null = remove.mutation.error;
  void data;
  void error;
  // @ts-expect-error Idle state cannot contain success records.
  const records: { data: { id: number; title: string }[] } = remove.mutation.data;
  void records;
}
remove.mutation.mutate({ ids: [1] }, {
  onSuccess(result) { const title: string | undefined = result.data[0]?.title; void title; },
});
// @ts-expect-error A raw name cannot claim a resource contract.
useDeleteMany({ resource: 'posts' });
// @ts-expect-error IDs retain the record schema's type.
remove.mutation.mutate({ ids: ['1'] });
// @ts-expect-error A caller cannot replace the bound resource at mutation time.
remove.mutation.mutate({ resource: 'other', ids: [1] });
// @ts-expect-error Legacy mutation policies cannot enable unchecked cache writes.
remove.mutation.mutate({ ids: [1], mutationMode: 'optimistic' });
// @ts-expect-error Legacy retry settings cannot duplicate a destructive operation.
useDeleteMany({ resource: posts, mutationOptions: { retry: 3 } });
const protectedPosts = defineResource('protected', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  delete: Type.Object({ reason: Type.String() }),
});
const protectedRemove = useDeleteMany({ resource: protectedPosts });
protectedRemove.mutation.mutate({ ids: [1], variables: { reason: 'Requested' } });
// @ts-expect-error A required delete payload cannot be omitted.
protectedRemove.mutation.mutate({ ids: [1] });
// @ts-expect-error Delete inputs derive from the delete schema.
protectedRemove.mutation.mutate({ ids: [1], variables: { reason: false } });
async function receipt() {
  const result = await remove.mutation.mutateAsync({ ids: [1] });
  const id: number | undefined = result.data[0]?.id;
  void id;
  // @ts-expect-error A successful receipt cannot be caller-selected.
  const title: boolean | undefined = result.data[0]?.title;
  void title;
}
void receipt;
type Schemas = typeof posts extends ResourceContract<infer S> ? S : never;
const options: UseDeleteManyOptions<Schemas> = { resource: posts, enabled: true };
const params: UseDeleteManyMutateParams<Schemas> = { ids: [1] };
useDeleteMany(options).mutation.mutate(params);
declare const dynamic: ResourceContract;
const dynamicOptions: UseDeleteManyOptions<ContractSchemas> = { resource: dynamic, enabled: false };
const dynamicParams: UseDeleteManyMutateParams<ContractSchemas> = { ids: [1], variables: { checkedAtRuntime: true } };
useDeleteMany(dynamicOptions).mutation.mutate(dynamicParams);
type ProtectedSchemas = typeof protectedPosts extends ResourceContract<infer S> ? S : never;
// @ts-expect-error Public parameter aliases retain required deletion input.
const missing: UseDeleteManyMutateParams<ProtectedSchemas> = { ids: [1] };
void missing;
// @ts-expect-error The unchecked batch-deletion entry point is gone.
legacy.useDeleteMany({ resource: 'posts' });
// @ts-expect-error Decoders cannot be used to restore the removed legacy lifecycle.
legacy.createDeleteManyMutation({ resource: 'posts' });
