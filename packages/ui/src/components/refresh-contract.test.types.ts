import type { ContractSchemas, useInfiniteList, useInvalidate } from '@svadmin/core';

export interface RefreshState {
  query: ReturnType<typeof useInfiniteList<ContractSchemas>>['query'];
  invalidate: ReturnType<typeof useInvalidate<ContractSchemas>>;
}
