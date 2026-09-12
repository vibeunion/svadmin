import type { CreateMutationResult } from '@tanstack/svelte-query';
import type { OvertimeResult } from './hook-utils.svelte';
import type { InferResourceInput, ResourceInputOperation } from './types';

// An omitted target must accept the payload for every possible bound resource.
type CommonInput<R extends string, O extends ResourceInputOperation> =
  (R extends string ? (input: InferResourceInput<R, O>) => void : never) extends
    (input: infer Input) => void ? Input : never;

type Variables<Input, O extends ResourceInputOperation, Batch extends boolean> =
  [Input] extends [never] ? { variables: never }
    : Batch extends true ? { variables: Input[] }
    : O extends 'delete'
      ? undefined extends Input ? { variables?: Input } : { variables: Input }
      : { variables: Input };

export type ResourceMutationParams<
  R extends string,
  O extends ResourceInputOperation,
  Params,
  Batch extends boolean = false,
> = Omit<Params, 'resource' | 'variables'> & (
  | ({ resource?: never } & Variables<CommonInput<R, O>, O, Batch>)
  | { [Target in R]: { resource: Target } & Variables<InferResourceInput<Target, O>, O, Batch> }[R]
);

export type ResourceMutationResult<Data, Error, Params, Context = unknown> = {
  mutation: CreateMutationResult<Data, Error, Params, Context>;
  readonly overtime: OvertimeResult;
};
