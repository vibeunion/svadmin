import { Type, type Static, type TObject, type TSchema } from '@sinclair/typebox';
import {
  defineResource, defineCommand, useList, useOne, useShow, useMany, useTable, useSelect,
  useInfiniteList, useCreate, useUpdate, useDelete, useCreateMany, useUpdateMany, useDeleteMany, useExport,
  useForm, useCustom, useCustomMutation, useInvalidate, usePermissions, type PermissionHints, type ContractSchemas, type ContractRecord, type BaseRecord,
  useLogin, useLogout, useUpdateIdentity, useUpdateProfile, useGetIdentity, useIsAuthenticated,
} from '@svadmin/core';
import { posts as scaffoldPosts } from '../../../packages/create-svadmin/template/src/resource-contracts';
import { demoContracts, demoContract } from '../../../example/src/resource-contracts';
import { createSupabaseRpc } from '../../../packages/supabase/src/rpc';

export function permissionHintTypes() {
  const permissions = usePermissions();
  // @ts-expect-error Provider values cannot be assigned a caller-selected type.
  usePermissions<string[]>();
  // @ts-expect-error Validated permission hints cannot be replaced by application code.
  permissions.raw = ['admin'];
  const map: PermissionHints = { admin: false };
  // @ts-expect-error A validated boolean map is immutable.
  map['admin'] = true;
  const list: PermissionHints = ['reader'];
  // @ts-expect-error A validated hint array has no mutable push operation.
  list.push('admin');
}

export function authenticationTypes() {
  useLogin().mutate({ identifier: 'reader', password: 'secret' });
  useLogout().mutate();
  useUpdateProfile().mutate({ name: 'Reader', avatar: new File([], 'avatar.png') });
  // @ts-expect-error Login input is required.
  useLogin().mutate();
  // @ts-expect-error Identity IDs are strings.
  useUpdateIdentity().mutate({ id: 42 });
  // @ts-expect-error Profile names are strings.
  useUpdateProfile().mutate({ name: 42 });
  // @ts-expect-error Avatar files belong to profile updates, not identity updates.
  useUpdateIdentity().mutate({ avatar: new File([], 'avatar.png') });
  // @ts-expect-error Optional identity fields cannot be present with undefined.
  useUpdateIdentity().mutate({ name: undefined });
  // @ts-expect-error Provider replies cannot be assigned caller-selected identity types.
  useGetIdentity<{ id: number }>();
  // @ts-expect-error Authentication state is read-only.
  useIsAuthenticated().isAuthenticated = true;
  const identity = useGetIdentity().data;
  if (identity) {
    // @ts-expect-error Decoded identity fields cannot be replaced.
    identity.name = 'Other';
  }
}

export async function verifyRpcBoundary(client: unknown) {
  const rpc = createSupabaseRpc(client);
  const result = await rpc.call('summary', { limit: 5 });
  // @ts-expect-error RPC results require a schema or narrowing before field access.
  void result.total;
  // @ts-expect-error Callers cannot select an unvalidated response type.
  await rpc.call<{ total: number }>('summary');
}

const record = Type.Object({
  id: Type.Number(),
  title: Type.String(),
  count: Type.Number(),
  active: Type.Boolean(),
  note: Type.Optional(Type.String()),
});
const posts = defineResource('posts', {
  record,
  create: Type.Object({ title: Type.String(), count: Type.Number() }),
  update: Type.Object({ title: Type.Optional(Type.String()) }),
  delete: Type.Object({ reason: Type.String() }),
});
const users = defineResource('users', {
  record: Type.Object({ id: Type.String(), name: Type.String() }),
  create: Type.Object({ name: Type.String() }),
});
const audit = defineResource('audit', { record });
const command = defineCommand('report', {
  url: '/reports',
  method: 'get',
  input: Type.Object({ year: Type.Number() }),
  output: Type.Object({ count: Type.Number() }),
});
const writeCommand = defineCommand('rebuild-report', {
  url: '/reports',
  method: 'post',
  input: Type.Object({ year: Type.Number() }),
  output: Type.Object({ count: Type.Number() }),
});
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
function expectType<T extends true>(_value?: T) {}

export async function exportTypes() {
  const exporter = useExport({
    resource: posts, download: false,
    filters: [{ field: 'count', operator: 'gte', value: 0 }],
    mapData: item => ({ heading: item.title.toUpperCase() }),
  });
  const records = await exporter.triggerExport();
  expectType<Equal<typeof records[number]['id'], number>>();
  void records;
  // @ts-expect-error Dynamic names are not resource contracts.
  useExport({ resource: 'posts' });
  // @ts-expect-error Caller-selected record generics are not proof of a schema.
  useExport<{ id: number }>({ resource: posts });
  // @ts-expect-error Filter values are checked against the record field type.
  useExport({ resource: posts, filters: [{ field: 'count', operator: 'eq', value: 'wrong' }] });
  // @ts-expect-error The mapper sees a schema-inferred string.
  useExport({ resource: posts, mapData: item => ({ heading: item.title.toFixed(2) }) });
  // @ts-expect-error State is read-only.
  exporter.isLoading = true;
}

export async function refreshTypes() {
  const invalidate = useInvalidate({ resource: posts });
  const completion = invalidate({ invalidates: ['list', 'many'] });
  expectType<Equal<typeof completion, Promise<void>>>();
  await completion;
  // @ts-expect-error Refresh requires a real resource contract.
  useInvalidate({ resource: 'posts' });
  // @ts-expect-error Unsupported scopes cannot broaden the operation.
  invalidate({ invalidates: ['everything'] });
  // @ts-expect-error A bound refresh cannot select another resource.
  invalidate({ resource: 'users' });
}

export function strictQueries() {
  const list = useList({ resource: posts, filters: [{ field: 'count', operator: 'gte', value: 0 }] });
  expectType<Equal<typeof list.data, { data: Static<typeof record>[]; total: number; [key: string]: unknown } | undefined>>();
  expectType<Equal<typeof list.error, unknown>>();
  if (list.isSuccess) {
    const rows: Static<typeof record>[] = list.data.data;
    void rows;
  }
  const one = useOne({ resource: users, id: 'u1' });
  expectType<Equal<typeof one.data, { data: { id: string; name: string } } | undefined>>();
  if (one.isSuccess) {
    const name: string = one.data.data.name;
    void name;
  }
  useList(() => ({ resource: posts, filters: [{ operator: 'or', value: [{ field: 'title' as const, operator: 'contains', value: 'a' }] }] }));
  useOne(() => ({ resource: posts, id: 1 }));
  useMany({ resource: posts, ids: [1, 2] });
  const show = useShow({ resource: posts, id: 1 });
  show.setShowId(2);
  const table = useTable({ resource: posts });
  table.setSorters([{ field: 'count', order: 'desc' }]);
  table.setFilters([{ field: 'count', operator: 'between', value: [1, 10] }]);
  const select = useSelect({ resource: users, optionLabel: 'name', optionValue: 'id', defaultValue: ['u1'] });
  expectType<Equal<typeof select.query.data, { data: { id: string; name: string }[]; total: number; options: { label: string; value: string | number }[] } | undefined>>();
  expectType<Equal<typeof select.options, { label: string; value: string | number }[]>>();
  useInfiniteList({ resource: posts });
  useList({ resource: scaffoldPosts });
  const demoAccounts = useList({ resource: demoContracts.crm_accounts });
  const dynamicDemo = useList({ resource: demoContract('products') });
  // @ts-expect-error Page models cannot invent properties absent from their schemas.
  void demoAccounts.data?.data[0]?.nextStep;
  // @ts-expect-error Validated dynamic resources retain unknown field values.
  const title: string | undefined = dynamicDemo.data?.data[0]?.title;
  void title;
  useInvalidate({ resource: posts })({ id: 1, invalidates: ['detail'] });
  // @ts-expect-error Refreshes are contract-bound too.
  useInvalidate({ resource: posts })({ id: '1' });

  // @ts-expect-error No implicit route resource.
  useList();
  // @ts-expect-error No unregistered string resource.
  useList({ resource: 'posts' });
  // @ts-expect-error A projection generic is not proof of a response contract.
  useList<{ id: number; invented: string }>({ resource: posts });
  // @ts-expect-error Unknown fields cannot fall back to a dynamic overload.
  useList({ resource: posts, sorters: [{ field: 'titlle', order: 'asc' }] });
  // @ts-expect-error Filter values follow the selected field.
  useList({ resource: posts, filters: [{ field: 'count', operator: 'eq', value: '0' }] });
  // @ts-expect-error String operators cannot target numeric fields.
  useList({ resource: posts, filters: [{ field: 'count', operator: 'contains', value: 1 }] });
  // @ts-expect-error Ranges require exactly two values.
  useList({ resource: posts, filters: [{ field: 'count', operator: 'between', value: [1] }] });
  // @ts-expect-error Nested logical filters retain field constraints.
  useList({ resource: posts, filters: [{ operator: 'and', value: [{ field: 'missing', operator: 'eq', value: 1 }] }] });
  // @ts-expect-error Numeric IDs cannot become strings.
  useOne({ resource: posts, id: '1' });
  // @ts-expect-error IDs are required, never inferred from the URL.
  useOne({ resource: posts });
  // @ts-expect-error Batch IDs use the same contract.
  useMany({ resource: users, ids: [1] });
  // @ts-expect-error Show setters preserve the ID type.
  show.setShowId('2');
  // @ts-expect-error Table setters cannot introduce unknown fields.
  table.setFilters([{ field: 'invented', operator: 'eq', value: true }]);
  // @ts-expect-error Typed rows cannot acquire an index signature.
  void table.clientData[0]?.invented;
  // @ts-expect-error Select defaults require contract IDs.
  useSelect({ resource: users, optionLabel: 'name', optionValue: 'id', defaultValue: [1] });

  const widened = useList<ContractSchemas>({ resource: posts });
  expectType<Equal<ContractRecord<ContractSchemas>, BaseRecord & { id: string | number }>>();
  // @ts-expect-error Widening the schema must never produce any.
  const invented: string | undefined = widened.data?.data[0]?.invented;
  void invented;
  type WidenedProperties = { [K in keyof typeof record.properties]: K extends 'title' ? TSchema : typeof record.properties[K] };
  const partiallyWidened = useList<{ record: TObject<WidenedProperties> }>({ resource: posts });
  // @ts-expect-error Widening a nested schema must produce unknown, not any.
  const unknownTitle: string | undefined = partiallyWidened.data?.data[0]?.title;
  void unknownTitle;
  return { list, one, select };
}

export async function strictWrites(target: typeof posts | typeof users) {
  const create = useCreate({ resource: posts });
  const result = await create.mutation.mutateAsync({ variables: { title: 'Hello', count: 1 } });
  expectType<Equal<typeof result.data, Static<typeof record>>>();
  create.mutation.mutate({ variables: { title: 'Hello', count: 1 } }, {
    onSuccess(_data) { expectType<Equal<typeof _data.data, Static<typeof record>>>(); },
  });
  useUpdate({ resource: posts, id: 1 }).mutation.mutate({ variables: { title: 'Changed' } });
  useDelete({ resource: posts, id: 1 }).mutation.mutate({ variables: { reason: 'duplicate' } });
  useDelete({ resource: users, id: 'u1' }).mutation.mutate({});
  useCreateMany({ resource: users }).mutation.mutate({ variables: [{ name: 'Alice' }] });
  useUpdateMany({ resource: posts }).mutation.mutate({ ids: [1], variables: {} });
  useDeleteMany({ resource: posts }).mutation.mutate({ ids: [1], variables: { reason: 'duplicate' } });

  // @ts-expect-error Create requires every required field.
  create.mutation.mutate({ variables: { title: 'Hello' } });
  // @ts-expect-error Bound writes cannot redirect to another resource.
  create.mutation.mutate({ resource: 'users', variables: { title: 'Hello', count: 1 } });
  // @ts-expect-error Data generics cannot replace a resource contract.
  useCreate<{ id: string }>({ resource: posts });
  // @ts-expect-error Updates require the correct ID type.
  useUpdate({ resource: users, id: 1 });
  // @ts-expect-error No implicit update ID.
  useUpdate({ resource: posts });
  // @ts-expect-error Required deletion metadata is enforced.
  useDeleteMany({ resource: posts }).mutation.mutate({ ids: [1] });
  // @ts-expect-error Batch IDs do not widen from the payload.
  useUpdateMany({ resource: posts }).mutation.mutate({ ids: ['1'], variables: {} });
  // @ts-expect-error Empty batches cannot enable a missing operation.
  useCreateMany({ resource: audit }).mutation.mutate({ variables: [] });
  // @ts-expect-error Read-only resources cannot be created.
  useCreate({ resource: audit }).mutation.mutate({ variables: {} });
  // @ts-expect-error Narrow the resource before supplying a resource-specific write input.
  useCreate({ resource: target }).mutation.mutate({ variables: { name: 'Alice' } });

  const form = useForm({ resource: posts, action: 'create', defaultValues: { title: '', count: 0 } });
  form.setFieldValue('count', 2);
  // @ts-expect-error Fixed form IDs cannot be changed through a hidden method.
  form.setId(2);
  // @ts-expect-error The submission mode is not part of the public form result.
  void form.mutationMode;
  // @ts-expect-error Form values follow the operation schema, not default inference.
  form.setFieldValue('title', 2);
  // @ts-expect-error Response-only fields are not writable.
  form.setFieldValue('id', 2);
  // @ts-expect-error A form cannot switch to another action contract.
  form.setAction('edit');
  // @ts-expect-error An edit form requires a typed ID.
  useForm({ resource: posts, action: 'edit', defaultValues: {} });
  // @ts-expect-error Default values cannot invent a new input model.
  useForm({ resource: posts, action: 'create', defaultValues: { invented: true } });
  return result;
}

export function strictCommands() {
  const report = useCustom({ command, input: { year: 2026 } });
  expectType<Equal<typeof report.query.data, { data: { count: number } } | undefined>>();
  useCustomMutation({ command: writeCommand }).mutation.mutate({ year: 2026 });
  // @ts-expect-error Command inputs are schema-bound.
  useCustom({ command, input: { year: '2026' } });
  // @ts-expect-error URLs cannot replace a command contract.
  useCustom({ url: '/reports', method: 'get' });
  // @ts-expect-error An untyped custom mutation is no longer exported.
  useCustomMutation();
  return report;
}

export function invalidDefinitions() {
  // @ts-expect-error Nested any is forbidden.
  defineResource('unsafe', { record: Type.Object({ id: Type.Number(), nested: Type.Object({ value: Type.Any() }) }) });
  // @ts-expect-error Unknown is not a record field contract.
  defineResource('unsafe', { record: Type.Object({ id: Type.Number(), value: Type.Unknown() }) });
  // @ts-expect-error The input schema cannot contain any.
  defineResource('unsafe', { record, create: Type.Object({ values: Type.Array(Type.Any()) }) });
  // @ts-expect-error A required ID is mandatory.
  defineResource('unsafe', { record: Type.Object({ title: Type.String() }) });
  // @ts-expect-error Command outputs cannot become any.
  defineCommand('unsafe', { url: '/reports', method: 'get', input: Type.Object({}), output: Type.Any() });
}
