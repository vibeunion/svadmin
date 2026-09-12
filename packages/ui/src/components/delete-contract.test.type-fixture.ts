import { Type } from '@sinclair/typebox';
import { defineResource, useDelete, UndoError, type ResourceContract, type UseDeleteOptions, type UseDeleteMutateParams } from '@svadmin/core';
import { parseContractDeleteInput } from '../../../core/src/resource-contract';

const plain = defineResource('plain', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const reason = defineResource('reason', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  delete: Type.Object({ reason: Type.String() }),
});
const remove = useDelete({ resource: plain, id: 1 });
void remove.mutation.mutateAsync({});
type Schemas = typeof reason extends ResourceContract<infer S> ? S : never;
const options: UseDeleteOptions<Schemas> = { resource: reason, id: 1, enabled: true };
const checked = useDelete(options);
const params: UseDeleteMutateParams<Schemas> = { variables: { reason: 'Duplicate' } };
void checked.mutation.mutateAsync(params, {
  onSuccess(result, input) {
    const reason: string = input.variables.reason;
    const id: number = result.data.id;
    void reason;
    void id;
  },
  onError(error, input) {
    if (!(error instanceof UndoError)) {
      const code: string | undefined = error.code;
      void code;
    }
    // @ts-expect-error Invalid preflight input cannot be exposed as checked parameters.
    const assumed: string = input.variables.reason;
    void assumed;
  },
});
void checked.mutation.mutateAsync({ variables: { reason: 'Duplicate' } });
if (checked.mutation.isSuccess) {
  const title: string = checked.mutation.data.data.title;
  void title;
  // @ts-expect-error Result types come from the record schema.
  const invalid: number = checked.mutation.data.data.title;
  void invalid;
}
if (checked.mutation.isError) {
  // @ts-expect-error Error states cannot promise successful data.
  const error: { data: { id: number; title: string } } = checked.mutation.data;
  void error;
}
if (checked.mutation.isIdle) {
  const data: undefined = checked.mutation.data;
  const error: null = checked.mutation.error;
  void data;
  void error;
  // @ts-expect-error A retired idle state cannot expose a deleted record.
  const oldId: number = checked.mutation.data.data.id;
  void oldId;
}
const parsed = parseContractDeleteInput(reason, { reason: 'Duplicate' });
const text: string = parsed.reason;
void text;
declare const erased: ResourceContract;
const dynamic = useDelete({ resource: erased, id: 1 });
void dynamic.mutation.mutateAsync({ variables: { runtimeChecked: true } });
const unknownInput = parseContractDeleteInput(erased, {});
// @ts-expect-error Erased metadata is not proof of a concrete payload.
const fabricated: { reason: string } = unknownInput;
void fabricated;
// @ts-expect-error Required deletion payload cannot be omitted.
void checked.mutation.mutateAsync({});
// @ts-expect-error Deletion payload values must match the schema.
void checked.mutation.mutateAsync({ variables: { reason: false } });
// @ts-expect-error No deletion schema means no arbitrary payload.
void remove.mutation.mutateAsync({ variables: { reason: 'Unexpected' } });
// @ts-expect-error Record IDs are schema-derived.
useDelete({ resource: reason, id: '1' });
// @ts-expect-error Raw strings do not carry a contract.
useDelete({ resource: 'reason', id: 1 });
// @ts-expect-error Per-call target overrides are forbidden.
void checked.mutation.mutateAsync({ variables: { reason: 'Duplicate' }, id: 2 });
// @ts-expect-error Callers cannot bypass refresh policy.
void checked.mutation.mutateAsync({ variables: { reason: 'Duplicate' }, invalidates: false });
// @ts-expect-error The strict API does not accept unchecked optimistic cache policy.
useDelete({ resource: reason, id: 1, mutationMode: 'optimistic' });
