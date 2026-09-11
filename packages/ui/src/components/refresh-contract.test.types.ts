import type { useInfiniteList, useInvalidate } from '@svadmin/core';

export interface RefreshState {
  query: ReturnType<typeof useInfiniteList>['query'];
  invalidate: ReturnType<typeof useInvalidate>;
}
