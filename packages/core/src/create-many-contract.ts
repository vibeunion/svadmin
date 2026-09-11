import { Type } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { parseContractId, parseContractRecord, parseContractCreateInput, requireContractCreateSchema,
  type ContractSchemas, type ContractCreateInput, type ResourceContract } from './resource-contract';
import { definedOptions } from './defined-options';
import { decodeBaseRecord, decodeManyResult, decodeOneResult, rejectProviderResponse } from './record-decoder';
import { HttpError, type BaseRecord } from './types';

const envelope = Type.Object({
  variables: Type.Array(Type.Unknown(), { minItems: 1 }),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });

export interface ContractCreateManyParams<S extends ContractSchemas> {
  variables: [ContractCreateInput<S>] extends [never] ? never : ContractCreateInput<S>[];
  meta?: Record<string, unknown>;
  dataProviderName?: string;
}

/** Indexes are zero-based; failures may have written data without a valid receipt. */
export class CreateManyPartialError extends HttpError {
  readonly succeeded: { index: number; record: BaseRecord }[];
  readonly failedIndexes: number[];
  readonly causes: HttpError[];
  constructor(succeeded: readonly { index: number; record: BaseRecord }[], failedIndexes: readonly number[], causes: readonly HttpError[]) {
    super('Batch create partially failed', 502, undefined, {
      code: 'CREATE_MANY_PARTIAL', details: { writeMayHaveSucceeded: true },
    });
    this.name = 'CreateManyPartialError';
    this.succeeded = succeeded.map(({ index, record }) => ({ index, record: decodeBaseRecord(snapshotPlainData(record)) }));
    this.failedIndexes = [...failedIndexes];
    this.causes = [...causes];
  }
}

export function snapshotCreateManyParams(value: unknown) {
  try {
    const input = snapshotPlainData(value);
    if (checkExact(envelope, input)) return input;
  } catch { /* Do not execute submitted accessors or expose their failures. */ }
  throw new HttpError('Invalid batch create input', 422, undefined, {
    code: 'INVALID_RESOURCE_INPUT', details: { writeMayHaveSucceeded: false },
  });
}

export function suppliedCreateId(contract: ResourceContract, input: unknown): string | number | undefined {
  const id: unknown = typeof input === 'object' && input !== null
    ? Object.getOwnPropertyDescriptor(input, 'id')?.value : undefined;
  return id === undefined ? undefined : parseContractId(contract, id);
}

/** Private schemas establish both payload types and client-supplied identities. */
export function parseCreateManyParams<S extends ContractSchemas>(contract: ResourceContract<S>, value: unknown): ContractCreateManyParams<S>;
export function parseCreateManyParams(contract: ResourceContract, value: unknown): object {
  requireContractCreateSchema(contract);
  const input = snapshotCreateManyParams(value);
  const variables = input.variables.map(value => parseContractCreateInput(contract, value));
  const seen = new Set<string | number>();
  for (const value of variables) {
    const id = suppliedCreateId(contract, value);
    if (id === undefined) continue;
    if (seen.has(id)) throw new HttpError('Duplicate create identity', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    seen.add(id);
  }
  return { variables, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }) };
}

/** Native receipts are positional for supplied IDs; generated IDs prove shape, not business correspondence. */
export function decodeCreateManyReceipt<S extends ContractSchemas>(
  contract: ResourceContract<S>, inputs: readonly unknown[], response: unknown, batch: boolean,
  seen: ReadonlySet<string | number>,
) {
  try {
    const receipt = snapshotPlainData(response);
    const records = batch
      ? decodeManyResult(receipt, value => parseContractRecord(contract, value), true).data
      : [decodeOneResult(receipt, value => parseContractRecord(contract, value), true).data];
    if (records.length !== inputs.length) return rejectProviderResponse(true);
    const identities = new Set(seen);
    for (const [index, record] of records.entries()) {
      const id = parseContractId(contract, record.id);
      const supplied = suppliedCreateId(contract, inputs[index]);
      if (identities.has(id) || (supplied !== undefined && supplied !== id)) return rejectProviderResponse(true);
      identities.add(id);
    }
    return records;
  } catch { return rejectProviderResponse(true); }
}
