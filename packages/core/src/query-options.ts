import { definedOptions } from './defined-options';

/**
 * 查询钩子可以安全转发的 TanStack Query 选项。
 * `select` 在解码之后执行，可以改变投影类型，且不会改写缓存里的原始响应。
 */
export interface ResourceQueryOptions<TQueryFnData = unknown, TData = TQueryFnData> {
  staleTime?: number;
  enabled?: boolean;
  gcTime?: number;
  refetchOnWindowFocus?: boolean | 'always';
  retry?: boolean | number;
  retryDelay?: number | ((failureCount: number, error: unknown) => number);
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  placeholderData?: TQueryFnData | ((previousData: TQueryFnData | undefined) => TQueryFnData | undefined);
  select?: (data: TQueryFnData) => TData;
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

export function listQuerySettings<TQueryFnData>(
  options: ResourceQueryOptions<TQueryFnData, unknown> | undefined,
): ListQuerySettings<TQueryFnData> {
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

function projectSelected<TQueryFnData, TData>(
  data: TQueryFnData,
  select?: (data: TQueryFnData) => TData,
): TQueryFnData | TData {
  return select ? select(data) : data;
}

export function applyQuerySelect<TQueryFnData>(data: TQueryFnData, select?: undefined): TQueryFnData;
export function applyQuerySelect<TQueryFnData, TData>(
  data: TQueryFnData,
  select: (data: TQueryFnData) => TData,
): TData;
export function applyQuerySelect<TQueryFnData, TData>(
  data: TQueryFnData,
  select?: (data: TQueryFnData) => TData,
): TQueryFnData | TData {
  return projectSelected(data, select);
}

export function applyListSelect<TQueryFnData>(data: TQueryFnData, select?: undefined): TQueryFnData;
export function applyListSelect<TQueryFnData, TData>(
  data: TQueryFnData,
  select: (data: TQueryFnData) => TData,
): TData;
export function applyListSelect<TQueryFnData, TData>(
  data: TQueryFnData,
  select?: (data: TQueryFnData) => TData,
): TQueryFnData | TData {
  return projectSelected(data, select);
}
