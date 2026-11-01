import { definedOptions } from './defined-options';

/**
 * useList / useTable 可以安全转发的 TanStack Query 选项。
 * `select` 在解码之后执行，避免改掉缓存里的原始响应。
 */
export interface ResourceQueryOptions<TData = unknown> {
  staleTime?: number;
  enabled?: boolean;
  gcTime?: number;
  refetchOnWindowFocus?: boolean | 'always';
  retry?: boolean | number;
  retryDelay?: number | ((failureCount: number, error: unknown) => number);
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  placeholderData?: TData | ((previousData: TData | undefined) => TData | undefined);
  select?: (data: TData) => TData;
}

export interface ListQuerySettings<TData = unknown> {
  enabled: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean | 'always';
  retry?: boolean | number;
  retryDelay?: ResourceQueryOptions<TData>['retryDelay'];
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  placeholderData?: ResourceQueryOptions<TData>['placeholderData'];
}

export function listQuerySettings<TData>(options: ResourceQueryOptions<TData> | undefined): ListQuerySettings<TData> {
  return {
    enabled: options?.enabled ?? true,
    ...definedOptions({
      staleTime: options?.staleTime,
      gcTime: options?.gcTime,
      refetchOnWindowFocus: options?.refetchOnWindowFocus,
      retry: options?.retry,
      retryDelay: options?.retryDelay,
      refetchInterval: options?.refetchInterval,
      refetchIntervalInBackground: options?.refetchIntervalInBackground,
      placeholderData: options?.placeholderData,
    }),
  };
}

export function applyListSelect<TData>(data: TData, select?: (data: TData) => TData): TData {
  return select ? select(data) : data;
}
