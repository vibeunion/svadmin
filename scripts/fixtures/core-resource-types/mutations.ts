import {
  defineResource, useCreate, useUpdate, useDelete, useCreateMany, useUpdateMany, useDeleteMany,
  type InferSchemaResourceMap, type InferSchemaInputMap, type ResourceSchemaMap, type BaseRecord,
  HttpError, DeleteManyPartialError,
} from '@svadmin/core';
import { Type, type Static } from '@sinclair/typebox';

const Post = Type.Object({ id: Type.Number(), title: Type.String() });
const CreatePost = Type.Union([
  Type.Object({ status: Type.Literal('draft'), title: Type.String() }),
  Type.Object({ status: Type.Literal('published'), title: Type.String(), publishedAt: Type.String() }),
]);
const User = Type.Object({ id: Type.String(), name: Type.String() });
export const schemas = {
  posts: {
    record: Post,
    create: CreatePost,
    update: Type.Object({ title: Type.Optional(Type.String()) }),
    delete: Type.Object({ reason: Type.String() }),
  },
  users: {
    record: User,
    create: Type.Object({ name: Type.String() }),
    update: Type.Object({ name: Type.String() }),
  },
  audit: { record: Type.Object({ id: Type.Number(), action: Type.String() }) },
} satisfies ResourceSchemaMap;

declare module '@svadmin/core' {
  interface ResourceTypeMap extends InferSchemaResourceMap<typeof schemas> {
    posts: Static<typeof Post>;
  }
  interface ResourceInputMap extends InferSchemaInputMap<typeof schemas> {
    posts: InferSchemaInputMap<typeof schemas>['posts'];
  }
}
const posts = defineResource('posts', schemas.posts);
const users = defineResource('users', schemas.users);
const audit = defineResource('audit', schemas.audit);

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
function expectType<T extends true>(_value?: T) {}

export async function mutations(resource: 'posts' | 'users') {
  expectType<Equal<InferSchemaResourceMap<ResourceSchemaMap>[string], BaseRecord>>();
  type DynamicInput = InferSchemaInputMap<{
    dynamic: { record: typeof Post; create: ReturnType<typeof Type.Any> };
  }>['dynamic']['create'];
  expectType<Equal<DynamicInput, unknown>>();
  const create = useCreate({ resource: posts });
  const draft = await create.mutation.mutateAsync({ variables: { status: 'draft', title: 'Hello' } });
  await create.mutation.mutateAsync({
    variables: { status: 'published', title: 'Hello', publishedAt: '2026-01-01' },
  });
  expectType<Equal<typeof draft.data, Static<typeof Post>>>();
  create.mutation.mutate({ variables: { status: 'draft', title: 'Hello' } }, {
    onSuccess(result, _params) {
      expectType<Equal<typeof result.data, Static<typeof Post>>>();
      expectType<Equal<typeof _params.variables, Static<typeof CreatePost>>>();
    },
  });
  // @ts-expect-error A discriminated input union must retain required variant fields.
  create.mutation.mutate({ variables: { status: 'published', title: 'Hello' } });
  // @ts-expect-error Required create fields cannot be omitted.
  create.mutation.mutate({ variables: { status: 'draft' } });
  // @ts-expect-error Field values are not arbitrary.
  create.mutation.mutate({ variables: { status: 'draft', title: 42 } });
  // @ts-expect-error A bound mutation cannot be redirected to another resource.
  create.mutation.mutate({ resource: 'users', variables: { status: 'draft', title: 'Hello' } });

  const update = useUpdate({ resource: posts, id: 1 });
  const updated = await update.mutation.mutateAsync({ variables: { title: 'Updated' } });
  expectType<Equal<typeof updated.data, Static<typeof Post>>>();
  update.mutation.mutate({ variables: {} });
  // @ts-expect-error Update fields must belong to the update schema.
  update.mutation.mutate({ variables: { name: 'Alice' } });

  const remove = useDelete({ resource: posts, id: 1 });
  const removed = await remove.mutation.mutateAsync({ variables: { reason: 'duplicate' } });
  expectType<Equal<typeof removed.data, Static<typeof Post>>>();
  // @ts-expect-error Required delete variables cannot disappear.
  remove.mutation.mutate({});
  // @ts-expect-error Required delete fields must have the correct type.
  remove.mutation.mutate({ variables: { reason: 42 } });
  const removeUser = useDelete({ resource: users, id: 'u1' });
  removeUser.mutation.mutate({});
  // @ts-expect-error A bodyless delete cannot accept arbitrary variables.
  removeUser.mutation.mutate({ variables: { reason: 'duplicate' } });

  const createMany = useCreateMany({ resource: posts });
  const createdBatch = await createMany.mutation.mutateAsync({
    variables: [{ status: 'draft', title: 'Hello' }],
  });
  expectType<Equal<typeof createdBatch.data, Static<typeof Post>[]>>();
  // @ts-expect-error Every batch item must match the create schema.
  createMany.mutation.mutate({ variables: [{ status: 'draft', title: 'Hello' }, { name: 'Alice' }] });
  const updateMany = useUpdateMany({ resource: users });
  const updatedBatch = await updateMany.mutation.mutateAsync({ ids: ['u1'], variables: { name: 'Alice' } });
  expectType<Equal<typeof updatedBatch.data, Static<typeof User>[]>>();
  // @ts-expect-error Update-many payloads are typed.
  updateMany.mutation.mutate({ ids: ['u1'], variables: { name: 42 } });
  const deleteMany = useDeleteMany({ resource: posts });
  const deletedBatch = await deleteMany.mutation.mutateAsync({ ids: [1], variables: { reason: 'duplicate' } });
  expectType<Equal<typeof deletedBatch.data, Static<typeof Post>[]>>();
  expectType<Equal<typeof deleteMany.mutation.error, HttpError | DeleteManyPartialError | null>>();
  // @ts-expect-error Delete-many must retain required variables.
  deleteMany.mutation.mutate({ ids: [1] });

  // A dynamic default cannot consume the payload of only one possible target.
  const createUser = useCreate({ resource: users });
  const dynamic = resource === 'posts' ? create : createUser;
  // @ts-expect-error The default resource might be users.
  dynamic.mutation.mutate({ variables: { status: 'draft', title: 'Hello' } });
  // @ts-expect-error A selected mutation cannot be redirected, even to a known resource.
  dynamic.mutation.mutate({ resource: 'posts', variables: { status: 'draft', title: 'Hello' } });
  // @ts-expect-error Resource selection must happen through the contract, not write parameters.
  dynamic.mutation.mutate({ resource: 'users', variables: { name: 'Alice' } });
  // @ts-expect-error Explicit targets and inputs remain correlated.
  dynamic.mutation.mutate({ resource: 'users', variables: { status: 'draft', title: 'Hello' } });
  const dynamicDelete = resource === 'posts' ? remove : removeUser;
  // @ts-expect-error posts requires variables, users forbids them.
  dynamicDelete.mutation.mutate({});
  // @ts-expect-error Bound delete identities cannot be replaced.
  dynamicDelete.mutation.mutate({ resource: 'posts', id: 1, variables: { reason: 'duplicate' } });
  // @ts-expect-error Bound delete resources cannot be replaced.
  dynamicDelete.mutation.mutate({ resource: 'users', id: 'u1' });
  const createUsers = useCreateMany({ resource: users });
  const dynamicBatch = resource === 'posts' ? createMany : createUsers;
  // @ts-expect-error A default batch must work for all possible resource targets.
  dynamicBatch.mutation.mutate({ variables: [{ name: 'Alice' }] });
  // @ts-expect-error Batch resource overrides are forbidden.
  dynamicBatch.mutation.mutate({ resource: 'users', variables: [{ name: 'Alice' }] });

  const disabledCreate = useCreate({ resource: audit });
  // @ts-expect-error A schema-less create operation is disabled.
  disabledCreate.mutation.mutate({ variables: {} });
  const disabledBatch = useCreateMany({ resource: audit });
  // @ts-expect-error Even an empty batch cannot bypass a missing create schema.
  disabledBatch.mutation.mutate({ variables: [] });
  const disabledUpdate = useUpdate({ resource: audit, id: 1 });
  // @ts-expect-error Update schemas must be registered explicitly.
  disabledUpdate.mutation.mutate({ variables: {} });

  type Projection = { id: number };
  type CustomError = { message: string; code: 'failed' };
  // @ts-expect-error Caller-selected response/error types are no longer accepted.
  useCreate<Projection, CustomError, { legacyField: boolean }>({ resource: posts });
  // @ts-expect-error Arbitrary output generics cannot replace a contract.
  useCreate<Projection>({ resource: 'postz' });
  // @ts-expect-error Bound resource names must exist.
  useDeleteMany({ resource: 'postz' });
  return {
    create, update, remove, deleteMany, dynamic,
    draft, updated, removed, createdBatch, updatedBatch, deletedBatch,
  };
}
