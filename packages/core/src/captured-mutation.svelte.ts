import { createMutation, type CreateMutationOptions, type MutateOptions } from '@tanstack/svelte-query';
import { replaceReactiveUnionMembers } from './reactive-projection';

interface Invocation<TParams, TScope> {
  readonly params: TParams;
  readonly scope: TScope | undefined;
  readScope(): TScope;
}

/** Capture before the query runtime awaits callbacks, without keying state by user params. */
export function createCapturedMutation<TData, TParams extends object, TScope, TContext = unknown>(
  capture: (params: TParams) => TScope,
  options: () => CreateMutationOptions<TData, unknown, Invocation<TParams, TScope>, TContext>,
  projectContext: (value: TContext | undefined) => unknown,
) {
  function prepare(params: TParams): Invocation<TParams, TScope> {
    try {
      const scope = capture(params);
      return Object.freeze({ params, scope, readScope: () => scope });
    } catch (error) {
      return Object.freeze({ params, scope: undefined, readScope: (): never => { throw error; } });
    }
  }
  const mutation = createMutation<TData, unknown, Invocation<TParams, TScope>, TContext>(options);
  function callbacks(value: MutateOptions<TData, unknown, TParams, unknown> = {}): MutateOptions<TData, unknown, Invocation<TParams, TScope>, TContext> {
    return {
      onSuccess: (data, invocation, context, execution) =>
        value.onSuccess?.(data, invocation.params, projectContext(context), execution),
      onError: (error, invocation, context, execution) =>
        value.onError?.(error, invocation.params, projectContext(context), execution),
      onSettled: (data, error, invocation, context, execution) =>
        value.onSettled?.(data, error, invocation.params, projectContext(context), execution),
    };
  }
  return replaceReactiveUnionMembers(mutation, {
    get variables() { return mutation.variables?.params; },
    get context() { return projectContext(mutation.context); },
    mutate(params: TParams, value?: MutateOptions<TData, unknown, TParams, unknown>): void {
      mutation.mutate(prepare(params), callbacks(value));
    },
    mutateAsync(params: TParams, value?: MutateOptions<TData, unknown, TParams, unknown>): Promise<TData> {
      return mutation.mutateAsync(prepare(params), callbacks(value));
    },
  });
}
