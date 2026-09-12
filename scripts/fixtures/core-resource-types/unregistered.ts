import { type BaseRecord, type KnownResources, type ResourceTypeMap } from '@svadmin/core';
import { useList, useOne, useMany, useTable, useInfiniteList } from '@svadmin/core/unsafe';
import * as unsafe from '@svadmin/core/unsafe';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
function expectType<T extends true>(_value?: T) {}

export function unregisteredQueries(resource: string) {
  expectType<Equal<keyof ResourceTypeMap, never>>();
  expectType<Equal<KnownResources, string>>();
  const list = useList({ resource });
  const one = useOne(() => ({ resource, id: 1 }));
  const many = useMany({ resource, ids: [1] });
  const table = useTable({ resource });
  const routeTable = useTable();
  expectType<Equal<typeof table.clientData, BaseRecord[]>>();
  expectType<Equal<typeof routeTable.clientData, BaseRecord[]>>();
  expectType<Equal<typeof list.data, { data: BaseRecord[]; total: number; [key: string]: unknown } | undefined>>();
  expectType<Equal<typeof one.data, { data: BaseRecord } | undefined>>();
  expectType<Equal<typeof many.data, { data: BaseRecord[] } | undefined>>();
  useList();
  useList({});
  useOne();
  // @ts-expect-error Detail views require the public contract-bound API.
  unsafe.useShow({ resource, id: 1 });

  type Post = { id: number; title: string };
  // @ts-expect-error A caller-selected result type is not validation.
  const typed = useOne<Post>({ resource, id: 1 });
  expectType<Equal<typeof typed.data, { data: BaseRecord } | undefined>>();
  // @ts-expect-error List response types cannot be selected by the caller.
  useList<Post>(() => ({ resource }));
  // @ts-expect-error Batch response types cannot be selected by the caller.
  useMany<Post>(() => ({ resource, ids: [1] }));
  // @ts-expect-error Table response types cannot be selected by the caller.
  const legacyTable = useTable<Post>(() => ({ resource }));
  expectType<Equal<typeof legacyTable.clientData, BaseRecord[]>>();
  // @ts-expect-error Form writes require the public contract-bound entry point.
  unsafe.useForm();
  useInfiniteList();
  // @ts-expect-error Infinite response types require a contract.
  useInfiniteList<Post>({ resource });
  const select = unsafe.useSelect({ resource, optionLabel: 'title' });
  expectType<Equal<typeof select.query.data, { data: BaseRecord[]; total: number; options: { label: string; value: string | number }[] } | undefined>>();
  // @ts-expect-error Unchecked selection cannot claim a caller-selected record type.
  unsafe.useSelect<Post>({ resource, optionLabel: 'title' });
  // @ts-expect-error Single creation requires the public contract-bound entry point.
  unsafe.useCreate({ resource }).mutation.mutate({ variables: { arbitrary: true } });
  // @ts-expect-error Single updates require the public contract-bound entry point.
  unsafe.useUpdate({ resource }).mutation.mutate({ id: 1, variables: { arbitrary: true } });
  // @ts-expect-error Single deletion requires the public contract-bound entry point.
  unsafe.useDelete({ resource }).mutation.mutate({ id: 1 });
  // @ts-expect-error Batch creation requires the public contract-bound entry point.
  unsafe.useCreateMany({ resource }).mutation.mutate({ variables: [{ arbitrary: true }] });
  // @ts-expect-error Batch updates require the public contract-bound entry point.
  unsafe.useUpdateMany({ resource }).mutation.mutate({ ids: [1], variables: { arbitrary: true } });
  // @ts-expect-error Batch deletion requires the public contract-bound entry point.
  unsafe.useDeleteMany({ resource }).mutation.mutate({ ids: [1] });
  // @ts-expect-error Create response types cannot be selected by the caller.
  unsafe.useCreate<Post>().mutation.mutate({ resource, variables: { title: 'legacy' } });
  // @ts-expect-error The unchecked create factory has been removed.
  unsafe.createCreateMutation({ resource });
  // @ts-expect-error Update response types cannot be selected by the caller.
  unsafe.useUpdate<Post>().mutation.mutate({ resource, id: 1, variables: { title: 'legacy' } });
  // @ts-expect-error The unchecked single-update factory has been removed.
  unsafe.createUpdateMutation({ resource });
  // @ts-expect-error Delete response types cannot be selected by the caller.
  unsafe.useDelete<Post>().mutation.mutate({ resource, id: 1, variables: { reason: 'legacy' } });
  // @ts-expect-error The unchecked deletion factory has been removed.
  unsafe.createDeleteMutation({ resource });
  // @ts-expect-error Batch-create response types cannot be selected by the caller.
  unsafe.useCreateMany<Post>().mutation.mutate({ resource, variables: [{ title: 'legacy' }] });
  // @ts-expect-error The unchecked batch-create implementation has been removed.
  unsafe.createCreateManyMutation({ resource });
  // @ts-expect-error The unchecked batch-update implementation has been removed.
  unsafe.createUpdateManyMutation({ resource });
  // @ts-expect-error The unchecked batch-delete implementation has been removed.
  unsafe.createDeleteManyMutation({ resource });

  // @ts-expect-error Unregistered data stays unknown, not any.
  const title: string | undefined = one.data?.data.title;
  // @ts-expect-error Batch queries still require IDs.
  useMany({ resource });
  void title;
  return { list, many, typed, table, routeTable, legacyTable };
}
