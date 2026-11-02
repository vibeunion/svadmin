import { fromPromise, type Result } from './result';
import { toDomainError, type DomainError } from './domain-errors';
import type {
  DataProvider,
  GetListParams,
  GetListResult,
  GetOneParams,
  GetOneResult,
  CreateParams,
  CreateResult,
  UpdateParams,
  UpdateResult,
  DeleteParams,
  DeleteResult,
  GetManyParams,
  GetManyResult,
  CreateManyParams,
  CreateManyResult,
  UpdateManyParams,
  UpdateManyResult,
  DeleteManyParams,
  DeleteManyResult,
  CustomParams,
  CustomResult,
} from './types';

export interface ConcurrencyLimiter {
  <T>(fn: () => Promise<T>): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  clear(): void;
}

/**
 * Creates a lightweight concurrency limiter (zero external dependencies).
 * Perfect for batch imports, multi-record deletions, and asset uploads.
 */
export function createConcurrencyLimiter(concurrency: number): ConcurrencyLimiter {
  if (concurrency < 1) {
    throw new RangeError('Concurrency limit must be at least 1');
  }

  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active < concurrency && queue.length > 0) {
      active++;
      const run = queue.shift()!;
      run();
    }
  };

  const limiter = async <T>(fn: () => Promise<T>): Promise<T> => {
    await new Promise<void>((resolve) => {
      queue.push(resolve);
      next();
    });

    try {
      return await fn();
    } finally {
      active--;
      next();
    }
  };

  Object.defineProperties(limiter, {
    activeCount: { get: () => active },
    pendingCount: { get: () => queue.length },
  });

  limiter.clear = () => {
    queue.length = 0;
  };

  return limiter as ConcurrencyLimiter;
}

export interface RetryOptions {
  readonly retries?: number;
  readonly minTimeout?: number;
  readonly maxTimeout?: number;
  readonly factor?: number;
  readonly jitter?: boolean;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Executes an async task with exponential backoff and jitter.
 */
export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  const minTimeout = options.minTimeout ?? 200;
  const maxTimeout = options.maxTimeout ?? 3000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await task(attempt);
    } catch (cause) {
      if (attempt > retries || !shouldRetry(cause, attempt)) {
        throw cause;
      }
      const baseDelay = Math.min(minTimeout * Math.pow(factor, attempt - 1), maxTimeout);
      const delay = jitter ? baseDelay * (0.5 + Math.random() * 0.5) : baseDelay;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Safe DataProvider contract that returns `Promise<Result<T, DomainError>>`
 * for imperative workflows, scripts, and high-rigor pipelines.
 */
export interface SafeDataProvider {
  readonly raw: DataProvider;
  getList: (params: GetListParams) => Promise<Result<GetListResult, DomainError>>;
  getOne: (params: GetOneParams) => Promise<Result<GetOneResult, DomainError>>;
  create: (params: CreateParams) => Promise<Result<CreateResult, DomainError>>;
  update: (params: UpdateParams) => Promise<Result<UpdateResult, DomainError>>;
  deleteOne: (params: DeleteParams) => Promise<Result<DeleteResult, DomainError>>;
  getApiUrl: () => string;
  getMany?: ((params: GetManyParams) => Promise<Result<GetManyResult, DomainError>>) | undefined;
  createMany?: ((params: CreateManyParams) => Promise<Result<CreateManyResult, DomainError>>) | undefined;
  updateMany?: ((params: UpdateManyParams) => Promise<Result<UpdateManyResult, DomainError>>) | undefined;
  deleteMany?: ((params: DeleteManyParams) => Promise<Result<DeleteManyResult, DomainError>>) | undefined;
  custom?: ((params: CustomParams) => Promise<Result<CustomResult, DomainError>>) | undefined;
}

/**
 * Wraps an existing DataProvider into a SafeDataProvider returning Result<T, DomainError>.
 */
export function wrapDataProviderWithResult(provider: DataProvider): SafeDataProvider {
  return {
    raw: provider,
    getApiUrl: () => provider.getApiUrl(),
    getList: (params) => fromPromise(provider.getList(params), toDomainError),
    getOne: (params) => fromPromise(provider.getOne(params), toDomainError),
    create: (params) => fromPromise(provider.create(params), toDomainError),
    update: (params) => fromPromise(provider.update(params), toDomainError),
    deleteOne: (params) => fromPromise(provider.deleteOne(params), toDomainError),
    getMany: provider.getMany
      ? (params) => fromPromise(provider.getMany!(params), toDomainError)
      : undefined,
    createMany: provider.createMany
      ? (params) => fromPromise(provider.createMany!(params), toDomainError)
      : undefined,
    updateMany: provider.updateMany
      ? (params) => fromPromise(provider.updateMany!(params), toDomainError)
      : undefined,
    deleteMany: provider.deleteMany
      ? (params) => fromPromise(provider.deleteMany!(params), toDomainError)
      : undefined,
    custom: provider.custom
      ? (params) => fromPromise(provider.custom!(params), toDomainError)
      : undefined,
  };
}
