import { Type } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { parseContractId, parseContractRecord, parseContractUpdateInput,
  type ContractSchemas, type ContractId, type ContractUpdateInput, type ResourceContract } from './resource-contract';
import { validateUpdateIdentity } from './update-contract';
import { definedOptions } from './defined-options';
import { decodeManyResult, decodeOneResult, rejectProviderResponse } from './record-decoder';
import { HttpError } from './types';

const envelope = Type.Object({
  ids: Type.Array(Type.Union([Type.String(), Type.Number()]), { minItems: 1, uniqueItems: true }),
  variables: Type.Unknown(),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });

export interface ContractUpdateManyParams<S extends ContractSchemas> {
  ids: NoInfer<ContractId<S>>[];
  variables: ContractUpdateInput<S>;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
}

/** A fallback may update only part of a batch; preserve checked identities for recovery. */
export class UpdateManyPartialError extends HttpError {
  readonly succeededIds: (string | number)[];
  readonly failedIds: (string | number)[];
  readonly causes: HttpError[];
  constructor(succeededIds: readonly (string | number)[], failedIds: readonly (string | number)[], causes: readonly HttpError[]) {
    super('Batch update partially failed', 502, undefined, {
      code: 'UPDATE_MANY_PARTIAL', details: { writeMayHaveSucceeded: true },
    });
    this.name = 'UpdateManyPartialError';
    this.succeededIds = [...succeededIds];
    this.failedIds = [...failedIds];
    this.causes = [...causes];
  }
}

export function snapshotUpdateManyParams(value: unknown) {
  try {
    const input = snapshotPlainData(value);
    if (checkExact(envelope, input)) return input;
  } catch { /* Never execute submitted accessors or disclose their failures. */ }
  throw new HttpError('Invalid batch update input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
  });
}

/** Private ID and update schemas establish the public operation parameter type. */
export function parseUpdateManyParams<S extends ContractSchemas>(contract: ResourceContract<S>, value: unknown): ContractUpdateManyParams<S>;
export function parseUpdateManyParams(contract: ResourceContract, value: unknown): object {
  const input = snapshotUpdateManyParams(value);
  const ids = input.ids.map(id => parseContractId(contract, id));
  const variables = parseContractUpdateInput(contract, input.variables);
  for (const id of ids) validateUpdateIdentity(variables, id);
  return { ids, variables, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }) };
}

export function decodeUpdateManyReceipt<S extends ContractSchemas>(
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
