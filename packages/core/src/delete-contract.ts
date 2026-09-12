import { Type } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { HttpError } from './types';
import { definedOptions } from './defined-options';
import { parseContractDeleteInput, parseContractId, parseContractRecord,
  type ContractDeleteInput, type ContractSchemas, type ResourceContract } from './resource-contract';
import { decodeOneResult, rejectProviderResponse } from './record-decoder';

export type ContractDeleteParams<S extends ContractSchemas> = {
  meta?: Record<string, unknown>;
  dataProviderName?: string;
} & (undefined extends ContractDeleteInput<S>
  ? { variables?: ContractDeleteInput<S> } : { variables: ContractDeleteInput<S> });

const envelope = Type.Object({
  variables: Type.Optional(Type.Unknown()),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });

export function snapshotDeleteParams(value: unknown) {
  try {
    const snapshot = snapshotPlainData(value);
    if (checkExact(envelope, snapshot)) return snapshot;
  } catch {
    // Accessor and serialization failures must not expose request values.
  }
  throw new HttpError('Invalid deletion input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
  });
}

/** Private schemas establish the public payload type, including payload-free deletion. */
export function parseDeleteParams<S extends ContractSchemas>(contract: ResourceContract<S>, value: unknown): ContractDeleteParams<S>;
export function parseDeleteParams(contract: ResourceContract, value: unknown): object {
  const input = snapshotDeleteParams(value);
  const variables = parseContractDeleteInput(contract, input.variables);
  return definedOptions({ variables, meta: input.meta, dataProviderName: input.dataProviderName });
}

export function decodeDeleteReceipt<S extends ContractSchemas>(
  contract: ResourceContract<S>, id: string | number, response: unknown,
) {
  try {
    const result = decodeOneResult(snapshotPlainData(response), value => parseContractRecord(contract, value), true);
    if (parseContractId(contract, result.data.id) !== id) return rejectProviderResponse(true);
    return result;
  } catch { return rejectProviderResponse(true); }
}
