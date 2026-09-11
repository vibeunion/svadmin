import { Type } from '@sinclair/typebox';
import { defineResource, useInfiniteList } from '@svadmin/core';

const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const { query } = useInfiniteList({ resource: posts });
if (query.isSuccess) {
  const title: string | undefined = query.data.pages[0]?.data[0]?.title;
  const page: number | undefined = query.data.pageParams[0];
  void title;
  void page;
}
if (query.isPending) {
  const empty: undefined = query.data;
  void empty;
}
if (query.isRefetchError) {
  const title: string | undefined = query.data.pages[0]?.data[0]?.title;
  const loading: false = query.isLoadingError;
  void title;
  void loading;
}
if (query.isFetchNextPageError) {
  // @ts-expect-error A first-page fetchNextPage failure has no previously loaded data.
  void query.data.pages;
  if (!query.isLoadingError) {
    const title: string | undefined = query.data.pages[0]?.data[0]?.title;
    const refetchError: false = query.isRefetchError;
    void title;
    void refetchError;
  }
}
async function pages() {
  const next = await query.fetchNextPage();
  if (next.isSuccess) {
    const id: number | undefined = next.data.pages[0]?.data[0]?.id;
    void id;
  }
  const result = await query.refetch();
  if (result.isSuccess) {
    const page: number | undefined = result.data.pageParams[0];
    void page;
  }
  // @ts-expect-error An unchecked result cannot claim nonoptional pages.
  void result.data.pages;
  // @ts-expect-error Transport error values are not assumed to be Error instances.
  const error: Error = result.error;
  void error;
}
void pages;
