import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { definedOptions } from './defined-options';
import { parseContractCreateInput, parseContractId, parseContractRecord,
  type ContractSchemas, type ContractCreateInput, type ResourceContract } from './resource-contract';
import { decodeOneResult, rejectProviderResponse } from './record-decoder';
import { HttpError } from './types';

const envelope = Type.Object({
  variables: Type.Unknown(),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });

export interface ContractCreateParams<S extends ContractSchemas> {
  variables: ContractCreateInput<S>;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
}

export function snapshotCreateParams(value: unknown) {
  try {
    const input = snapshotPlainData(value);
    if (checkExact(envelope, input)) return input;
  } catch { /* Submitted accessors and serialization hooks are not input data. */ }
  throw new HttpError('Invalid create input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
  });
}

/** Receipts and inputs both use the private record ID schema, not caller-selected types. */
export function createInputId(contract: ResourceContract, value: unknown): string | number | undefined {
  const id: unknown = typeof value === 'object' && value !== null
    ? Object.getOwnPropertyDescriptor(value, 'id')?.value : undefined;
  return id === undefined ? undefined : parseContractId(contract, id);
}

export function parseCreateParams<S extends ContractSchemas>(contract: ResourceContract<S>, value: unknown): ContractCreateParams<S>;
export function parseCreateParams(contract: ResourceContract, value: unknown): object {
  const input = snapshotCreateParams(value);
  const variables = parseContractCreateInput(contract, input.variables);
  createInputId(contract, variables);
  return { variables, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }) };
}

export function decodeCreateReceipt<S extends ContractSchemas>(
  contract: ResourceContract<S>, response: unknown, suppliedId: string | number | undefined,
) {
  try {
    const result = decodeOneResult(snapshotPlainData(response), value => parseContractRecord(contract, value), true);
    const id = parseContractId(contract, result.data.id);
    if (suppliedId !== undefined && suppliedId !== id) return rejectProviderResponse(true);
    return result;
  } catch { return rejectProviderResponse(true); }
}
