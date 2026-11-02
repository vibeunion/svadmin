import { err, fromPromise, type Result } from './result';
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

export class ConcurrencyLimitClearedError extends Error {
  constructor() {
    super('Concurrency limiter cleared');
    this.name = 'ConcurrencyLimitClearedError';
  }
}

export interface ConcurrencyLimiter {
  <T>(fn: () => Promise<T>): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  clear(): void;
}

interface LimitWaiter {
  resolve: () => void;
  reject: (error: unknown) => void;
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
  const queue: LimitWaiter[] = [];

  const next = () => {
    if (active < concurrency && queue.length > 0) {
      const run = queue.shift();
      if (run) {
        active++;
        run.resolve();
      }
    }
  };

  const limiter = async <T>(fn: () => Promise<T>): Promise<T> => {
    await new Promise<void>((resolve, reject) => {
      queue.push({ resolve, reject });
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
    const dropped = queue.splice(0);
    for (const waiter of dropped) waiter.reject(new ConcurrencyLimitClearedError());
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
  const getMany = provider.getMany?.bind(provider);
  const createMany = provider.createMany?.bind(provider);
  const updateMany = provider.updateMany?.bind(provider);
  const deleteMany = provider.deleteMany?.bind(provider);
  const custom = provider.custom?.bind(provider);

  const asResult = <T>(run: () => Promise<T>): Promise<Result<T, DomainError>> => {
    try {
      return fromPromise(Promise.resolve(run()), toDomainError);
    } catch (cause) {
      return Promise.resolve(err(toDomainError(cause)));
    }
  };

  return {
    raw: provider,
    getApiUrl: () => provider.getApiUrl(),
    getList: (params) => asResult(() => provider.getList(params)),
    getOne: (params) => asResult(() => provider.getOne(params)),
    create: (params) => asResult(() => provider.create(params)),
    update: (params) => asResult(() => provider.update(params)),
    deleteOne: (params) => asResult(() => provider.deleteOne(params)),
    getMany: getMany ? (params) => asResult(() => getMany(params)) : undefined,
    createMany: createMany ? (params) => asResult(() => createMany(params)) : undefined,
    updateMany: updateMany ? (params) => asResult(() => updateMany(params)) : undefined,
    deleteMany: deleteMany ? (params) => asResult(() => deleteMany(params)) : undefined,
    custom: custom ? (params) => asResult(() => custom(params)) : undefined,
  };
}
