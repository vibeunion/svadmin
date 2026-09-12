import { Type } from '@sinclair/typebox';
import { defineResource, useCreate, type ResourceContract, type UseCreateOptions, type UseCreateMutateParams } from '@svadmin/core';
import { parseCreateParams } from '../../../core/src/create-contract';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  create: Type.Object({ title: Type.String() }),
});
type Schemas = typeof posts extends ResourceContract<infer S> ? S : never;
const options: UseCreateOptions<Schemas> = { resource: posts, enabled: true };
const create = useCreate(options);
const params: UseCreateMutateParams<Schemas> = { variables: { title: 'Created' } };
void create.mutation.mutateAsync(params);
void create.mutation.mutateAsync(params, {
  onSuccess(result, submitted) {
    const title: string = submitted.variables.title;
    const id: number = result.data.id;
    void title;
    void id;
    // @ts-expect-error Callback inputs retain the create schema.
    const fabricated: boolean = submitted.variables.title;
    void fabricated;
  },
  onError(_error, submitted) {
    const title: string | undefined = submitted?.variables.title;
    void title;
    // @ts-expect-error Preflight failures do not expose invalid input as a checked payload.
    const assumed: string = submitted.variables.title;
    void assumed;
  },
});
if (create.mutation.isSuccess) {
  const title: string = create.mutation.data.data.title;
  const id: number = create.mutation.data.data.id;
  void title;
  void id;
  // @ts-expect-error Receipts derive from the resource record schema.
  const wrong: boolean = create.mutation.data.data.title;
  void wrong;
}
if (create.mutation.isError) {
  const code: string | undefined = create.mutation.error.code;
  void code;
  // @ts-expect-error Error states do not promise success data.
  const result: { data: { id: number; title: string } } = create.mutation.data;
  void result;
}
if (create.mutation.isIdle) {
  const data: undefined = create.mutation.data;
  const error: null = create.mutation.error;
  void data;
  void error;
  // @ts-expect-error A retired session exposes idle state, not a successful receipt.
  const previousId: number = create.mutation.data.data.id;
  void previousId;
}
const parsed = parseCreateParams(posts, params);
const title: string = parsed.variables.title;
void title;
declare const dynamic: ResourceContract;
const erased = useCreate({ resource: dynamic });
void erased.mutation.mutateAsync({ variables: { checkedAtRuntime: true } });
// @ts-expect-error An erased contract cannot invent a concrete payload.
const fabricated: { title: string } = erased.mutation.variables?.variables;
void fabricated;
// @ts-expect-error Variables are required.
void create.mutation.mutateAsync({});
// @ts-expect-error Payload fields derive from the create schema.
void create.mutation.mutateAsync({ variables: { title: false } });
// @ts-expect-error Unknown fields are rejected.
void create.mutation.mutateAsync({ variables: { title: 'Created', id: 1 } });
// @ts-expect-error Resource overrides are forbidden.
void create.mutation.mutateAsync({ variables: { title: 'Created' }, resource: 'other' });
// @ts-expect-error Refresh cannot be disabled.
void create.mutation.mutateAsync({ variables: { title: 'Created' }, invalidates: false });
// @ts-expect-error Old observer overrides cannot control dispatch.
useCreate({ resource: posts, mutationOptions: {} });
// @ts-expect-error Raw resource names are not resource contracts.
useCreate({ resource: 'posts' });
// @ts-expect-error Caller-selected result types are not validation.
useCreate<{ id: number; title: string }>({ resource: posts });
const readOnly = defineResource('readOnly', { record: Type.Object({ id: Type.Number() }) });
// @ts-expect-error Missing create schemas cannot produce payload types.
void useCreate({ resource: readOnly }).mutation.mutateAsync({ variables: {} });
const categories = defineResource('categories', {
  record: Type.Object({ id: Type.String(), name: Type.String() }), create: Type.Object({ name: Type.String() }),
});
const selected = Math.random() ? create : useCreate({ resource: categories });
// @ts-expect-error A selected mutation cannot accept only one possible target's payload.
void selected.mutation.mutateAsync({ variables: { title: 'Created' } });
// @ts-expect-error A potentially read-only target cannot accept a create payload.
void useCreate({ resource: Math.random() ? posts : readOnly }).mutation.mutateAsync({ variables: { title: 'Created' } });
