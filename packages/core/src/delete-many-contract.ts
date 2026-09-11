import { Type } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { parseContractId, parseContractRecord, parseContractDeleteInput, type ContractSchemas, type ContractId, type ResourceContract } from './resource-contract';
import type { ContractDeleteParams } from './delete-hooks.svelte';
import { definedOptions } from './defined-options';
import { decodeManyResult, decodeOneResult, rejectProviderResponse } from './record-decoder';
import { HttpError } from './types';

const envelope = Type.Object({
  ids: Type.Array(Type.Union([Type.String(), Type.Number()]), { minItems: 1, uniqueItems: true }),
  variables: Type.Optional(Type.Unknown()),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });
export type ContractDeleteManyParams<S extends ContractSchemas> =
  ContractDeleteParams<S> & { ids: NoInfer<ContractId<S>>[] };

export function snapshotDeleteManyParams(value: unknown) {
  try {
    const input = snapshotPlainData(value);
    if (checkExact(envelope, input)) return input;
  } catch { /* Input failures must not disclose transport values or invoke accessors. */ }
  throw new HttpError('Invalid batch deletion input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
  });
}

/** The private ID and delete schemas justify the operation-specific parameter type. */
export function parseDeleteManyParams<S extends ContractSchemas>(
  contract: ResourceContract<S>, value: unknown,
): ContractDeleteManyParams<S>;
export function parseDeleteManyParams(contract: ResourceContract, value: unknown): object {
  const input = snapshotDeleteManyParams(value);
  return definedOptions({
    ids: input.ids.map(id => parseContractId(contract, id)),
    variables: parseContractDeleteInput(contract, input.variables),
    meta: input.meta, dataProviderName: input.dataProviderName,
  });
}

export function decodeDeleteManyReceipt<S extends ContractSchemas>(
  contract: ResourceContract<S>, ids: readonly (string | number)[], response: unknown, batch: boolean,
) {
  try {
    const snapshot = snapshotPlainData(response);
    const records = batch
      ? decodeManyResult(snapshot, value => parseContractRecord(contract, value), true).data
      : [decodeOneResult(snapshot, value => parseContractRecord(contract, value), true).data];
    if (records.length !== ids.length) return rejectProviderResponse(true);
    const expected = new Set(ids);
    const seen = new Set<string | number>();
    for (const record of records) {
      const id = parseContractId(contract, record.id);
      if (!expected.has(id) || seen.has(id)) return rejectProviderResponse(true);
      seen.add(id);
    }
    return records;
  } catch { return rejectProviderResponse(true); }
}
