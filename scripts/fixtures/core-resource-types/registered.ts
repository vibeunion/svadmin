import {
  defineResource, withResourceSchemas, useList, useOne, useShow, useMany, useTable,
  useForm, useInfiniteList, useSelect,
  type BaseRecord, type InferData, type KnownResources, type DataProvider,
  type ResourceSchemaMap, type InferSchemaResourceMap, type GetListResult,
} from '@svadmin/core';
import { Type, type Static } from '@sinclair/typebox';

const PostSchema = Type.Object({
  id: Type.Readonly(Type.Number()),
  title: Type.String(),
  status: Type.Union([Type.Literal('draft'), Type.Literal('published')]),
  summary: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
export const UserSchema = Type.Object({ id: Type.String(), name: Type.String() });
type Post = Static<typeof PostSchema>;
type User = Static<typeof UserSchema>;
export const schemas = {
  posts: {
    record: PostSchema,
    create: Type.Object({
      title: Type.String(), authorId: Type.Number(), tags: Type.Array(Type.String()),
      settings: Type.Object({ visible: Type.Boolean() }),
    }),
  },
  users: { record: UserSchema },
} satisfies ResourceSchemaMap;

declare module '@svadmin/core' {
  interface ResourceTypeMap extends InferSchemaResourceMap<typeof schemas> {
    posts: Post;
  }
}
const posts = defineResource('posts', schemas.posts);
const users = defineResource('users', schemas.users);

export function schemaProvider(provider: DataProvider) {
  // @ts-expect-error Every resource must provide its record schema.
  withResourceSchemas(provider, { posts: {} });
  const validated = withResourceSchemas(provider, schemas);
  // @ts-expect-error A schema map is not permission to select an unrelated output type.
  validated.getList<{ id: number; invented: true }>({ resource: 'posts' });
  return validated;
}

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
function expectType<T extends true>(_value?: T) {}

export function registeredQueries(resource: KnownResources) {
  expectType<Equal<KnownResources, 'posts' | 'users'>>();
  expectType<Equal<InferData<'posts'>, Post>>();

  const list = useList({ resource: posts });
  const one = useOne({ resource: users, id: 'user-1' });
  const show = useShow({ resource: posts, id: 1 });
  const many = useMany({ resource: users, ids: ['user-1'] });
  const table = useTable({ resource: posts });
  const reactiveTable = useTable(() => ({ resource: users }));
  const infinite = useInfiniteList({ resource: posts });
  const select = useSelect({
    resource: users,
    optionLabel: user => user.name,
    optionValue: user => user.id,
  });
  const page = infinite.query.data?.pages[0];
  expectType<Equal<typeof page, GetListResult<Post> | undefined>>();
  expectType<Equal<typeof select.query.data, { data: User[]; total: number; options: { label: string; value: string | number }[] } | undefined>>();
  expectType<Equal<typeof list.data, { data: Post[]; total: number; [key: string]: unknown } | undefined>>();
  expectType<Equal<typeof one.data, { data: User } | undefined>>();
  expectType<Equal<typeof show.data, { data: Post } | undefined>>();
  expectType<Equal<typeof many.data, { data: User[] } | undefined>>();
  expectType<Equal<typeof table.query.data, typeof list.data>>();
  expectType<Equal<typeof table.clientData, Post[]>>();
  expectType<Equal<typeof reactiveTable.clientData, User[]>>();
  expectType<Equal<typeof one.error, unknown>>();
  expectType<Equal<typeof list.overtime.elapsedTime, number>>();
  show.setShowId(2);
  expectType<Equal<typeof show.showId, number>>();

  const reactiveList = useList(() => ({ resource: posts }));
  const reactiveOne = useOne(() => ({ resource: users, id: 'user-1' }));
  const reactiveShow = useShow(() => ({ resource: posts, id: 1 }));
  const reactiveMany = useMany(() => ({ resource: users, ids: ['user-1'] }));
  expectType<Equal<typeof reactiveList.data, typeof list.data>>();
  expectType<Equal<typeof reactiveOne.data, typeof one.data>>();
  expectType<Equal<typeof reactiveShow.data, typeof show.data>>();
  expectType<Equal<typeof reactiveMany.data, typeof many.data>>();

  // Declaration merging can constrain names, but cannot prove a response schema.
  // @ts-expect-error A registered name alone is not a resource contract.
  useOne({ resource, id: 1 });
  // @ts-expect-error Route-derived queries cannot infer a validated model.
  useOne();
  // @ts-expect-error Arbitrary response generics are no longer accepted.
  useList<{ id: number; count: number }>({ resource: posts });
  // @ts-expect-error Arbitrary error generics are no longer accepted.
  useTable<typeof schemas.posts, { code: 'failed' }>({ resource: posts });
  // @ts-expect-error Infinite queries also require a contract.
  useInfiniteList({ resource: 'posts' });
  // @ts-expect-error Selection queries also require a contract.
  useSelect({ resource: 'users', optionLabel: 'name', optionValue: 'id' });
  // @ts-expect-error IDs are tied to the record schema.
  useShow({ resource: posts, id: '1' });
  // @ts-expect-error Batch IDs are tied to the record schema.
  useMany({ resource: users, ids: [1] });

  const form = useForm({
    resource: posts, action: 'create',
    defaultValues: { title: '', authorId: 0, tags: ['draft'], settings: { visible: true } },
  });
  form.setFieldValue('title', 'Hello');
  form.setFieldValue('authorId', 42);
  form.setFieldValue('tags', ['published']);
  form.setFieldValue('settings', { visible: false });
  // @ts-expect-error Form fields must exist in the schema.
  form.setFieldValue('titlle', 'Hello');
  // @ts-expect-error Field values must match the selected field.
  form.setFieldValue('title', 42);
  // @ts-expect-error A value must not widen the selected key.
  form.setFieldValue('authorId', 'Hello');
  // @ts-expect-error Array elements retain their type.
  form.setFieldValue('tags', [42]);
  // @ts-expect-error Nested values retain their type.
  form.setFieldValue('settings', { visible: 'yes' });
  // @ts-expect-error Field names are not dot-separated paths.
  form.setFieldValue('settings.visible', true);

  // @ts-expect-error Registered resource names must exist.
  defineResource('postz', schemas.posts);
  // @ts-expect-error Query records do not acquire an index signature.
  void list.data?.data[0]?.titlle;
  // @ts-expect-error Table records do not acquire an index signature.
  void table.clientData[0]?.titlle;
  // @ts-expect-error Infinite records retain their fields.
  void page?.data[0]?.titlle;
  // @ts-expect-error Selection records retain their fields.
  void select.query.data?.data[0]?.title;
  // @ts-expect-error A user is not a post.
  void one.data?.data.title;
  // @ts-expect-error A post is not a user.
  void show.data?.data.name;
  // @ts-expect-error Batch elements retain their fields.
  void many.data?.data[0]?.title;
  // @ts-expect-error Fields do not become any.
  const wrongTitle: number | undefined = list.data?.data[0]?.title;
  void wrongTitle;
  if (show.data) {
    // @ts-expect-error Readonly schema properties remain readonly.
    show.data.data.id = 2;
    expectType<Equal<typeof show.data.data.summary, string | null | undefined>>();
  }
  expectType<Equal<Awaited<ReturnType<DataProvider['getOne']>>, { data: BaseRecord }>>();
  return { reactiveList, reactiveOne, reactiveShow, reactiveMany, reactiveTable };
}
