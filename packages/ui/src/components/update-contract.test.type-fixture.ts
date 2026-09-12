import { Type } from '@sinclair/typebox';
import { defineResource, useUpdate, captureAuthSession, type ResourceContract, type UseUpdateOptions, type UseUpdateMutateParams } from '@svadmin/core';
import { parseContractUpdateInput } from '../../../core/src/resource-contract';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  update: Type.Object({ title: Type.String() }),
});
type Schemas = typeof posts extends ResourceContract<infer S> ? S : never;
const options: UseUpdateOptions<Schemas> = { resource: posts, id: 1, enabled: true };
const update = useUpdate(options);
const params: UseUpdateMutateParams<Schemas> = { variables: { title: 'Edited' } };
void update.mutation.mutateAsync(params, {
  onSuccess(result, submitted) {
    const title: string = submitted.variables.title;
    const id: number = result.data.id;
    void title;
    void id;
  },
  onError(error, submitted) {
    const code: string | undefined = error.code;
    const title: string | undefined = submitted?.variables.title;
    void code;
    void title;
    // @ts-expect-error Preflight failures cannot promise checked input parameters.
    const assumed: string = submitted.variables.title;
    void assumed;
  },
});
void update.mutation.mutateAsync({ variables: { title: 'Edited' } });
if (update.mutation.isSuccess) {
  const title: string = update.mutation.data.data.title;
  void title;
  // @ts-expect-error Results derive from the record schema.
  const invalid: number = update.mutation.data.data.title;
  void invalid;
}
if (update.mutation.isError) {
  const code: string | undefined = update.mutation.error.code;
  void code;
  // @ts-expect-error Error states cannot promise success data.
  const invalid: { data: { id: number; title: string } } = update.mutation.data;
  void invalid;
}
if (update.mutation.isIdle) {
  const data: undefined = update.mutation.data;
  const error: null = update.mutation.error;
  void data;
  void error;
  // @ts-expect-error Retired idle state cannot expose an earlier receipt.
  const oldId: number = update.mutation.data.data.id;
  void oldId;
}
const session = captureAuthSession(null);
// @ts-expect-error Public capabilities are read-only snapshots.
session.available = true;
// @ts-expect-error Mutable authentication internals are not public API.
session.liveRevision = 2;
// @ts-expect-error Callers cannot invent an authentication provider.
captureAuthSession({});
const parsed = parseContractUpdateInput(posts, { title: 'Edited' });
const title: string = parsed.title;
void title;
declare const erased: ResourceContract;
void useUpdate({ resource: erased, id: 1 }).mutation.mutateAsync({ variables: { runtimeChecked: true } });
const unknownInput = parseContractUpdateInput(erased, {});
// @ts-expect-error Erased contracts cannot manufacture concrete input types.
const fabricated: { title: string } = unknownInput;
void fabricated;
// @ts-expect-error Variables are required.
void update.mutation.mutateAsync({});
// @ts-expect-error Payloads must match the update schema.
void update.mutation.mutateAsync({ variables: { title: false } });
// @ts-expect-error Excess fields are not a schema match.
void update.mutation.mutateAsync({ variables: { title: 'Edited', extra: true } });
// @ts-expect-error IDs derive from the record schema.
useUpdate({ resource: posts, id: '1' });
// @ts-expect-error A raw resource name is not a contract.
useUpdate({ resource: 'posts', id: 1 });
// @ts-expect-error Per-call target changes are forbidden.
void update.mutation.mutateAsync({ variables: { title: 'Edited' }, id: 2 });
// @ts-expect-error Callers cannot bypass refresh policy.
void update.mutation.mutateAsync({ variables: { title: 'Edited' }, invalidates: false });
// @ts-expect-error Unchecked optimistic writes are not exposed.
useUpdate({ resource: posts, id: 1, mutationMode: 'optimistic' });
const readOnly = defineResource('readOnly', { record: Type.Object({ id: Type.Number() }) });
// @ts-expect-error A missing update schema does not accept arbitrary input.
void useUpdate({ resource: readOnly, id: 1 }).mutation.mutateAsync({ variables: {} });
