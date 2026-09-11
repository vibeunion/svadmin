import { Type } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { HttpError } from './types';
import { definedOptions } from './defined-options';
import { parseContractId, parseContractRecord, parseContractUpdateInput,
  type ContractSchemas, type ContractUpdateInput, type ResourceContract } from './resource-contract';
import { decodeOneResult, rejectProviderResponse } from './record-decoder';

export interface ContractUpdateParams<S extends ContractSchemas> {
  variables: ContractUpdateInput<S>;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
}

const envelope = Type.Object({
  variables: Type.Unknown(),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });

export function snapshotUpdateParams(value: unknown) {
  try {
    const snapshot = snapshotPlainData(value);
    if (checkExact(envelope, snapshot)) return snapshot;
  } catch {
    // Reject accessors and serialization hooks without disclosing input.
  }
  throw new HttpError('Invalid update input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
  });
}

export function validateUpdateIdentity(variables: unknown, id: string | number): void {
  if (typeof variables !== 'object' || variables === null || Array.isArray(variables)) return;
  const property = Object.getOwnPropertyDescriptor(variables, 'id');
  if (!property) return;
  const candidate: unknown = property.value;
  if (candidate === id) return;
  throw new HttpError('Updates cannot change the record ID', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
  });
}

/** Private schemas validate the input before establishing its public type. */
export function parseUpdateParams<S extends ContractSchemas>(
  contract: ResourceContract<S>, id: string | number, value: unknown,
): ContractUpdateParams<S>;
export function parseUpdateParams(contract: ResourceContract, id: string | number, value: unknown): object {
  const input = snapshotUpdateParams(value);
  const identity = parseContractId(contract, id);
  const variables = parseContractUpdateInput(contract, input.variables);
  validateUpdateIdentity(variables, identity);
  return { variables, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }) };
}

export function decodeUpdateReceipt<S extends ContractSchemas>(
  contract: ResourceContract<S>, id: string | number, response: unknown,
) {
  try {
    const result = decodeOneResult(snapshotPlainData(response), value => parseContractRecord(contract, value), true);
    if (parseContractId(contract, result.data.id) !== id) return rejectProviderResponse(true);
    return result;
  } catch { return rejectProviderResponse(true); }
}
