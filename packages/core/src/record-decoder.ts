import { Type } from '@sinclair/typebox';
import { createExactSchemaValidator } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { HttpError, type BaseRecord, type GetListResult, type GetOneResult, type GetManyResult, type CustomResult } from './types';

export type RecordDecoder<T extends BaseRecord> = (value: unknown) => T;

const record = Type.Record(Type.String(), Type.Unknown());
const recordValidator = createExactSchemaValidator(record);
const customValidator = createExactSchemaValidator(Type.Object({ data: Type.Unknown() }));
const oneValidator = createExactSchemaValidator(Type.Object({ data: record }));
const manyValidator = createExactSchemaValidator(Type.Object({ data: Type.Array(record) }));
const listValidator = createExactSchemaValidator(Type.Object({
  data: Type.Array(record),
  total: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
}));

function invalidResponse(writeMayHaveSucceeded = false): never {
  throw new HttpError('Invalid provider response', 502, undefined, {
    code: 'INVALID_PROVIDER_RESPONSE',
    details: { phase: 'response', writeMayHaveSucceeded },
  });
}
export { invalidResponse as rejectProviderResponse };

export const decodeBaseRecord: RecordDecoder<BaseRecord> = value =>
  recordValidator.Check(value) ? value : invalidResponse();

function decodeRecord<T extends BaseRecord>(value: unknown, decode: RecordDecoder<T>, writeMayHaveSucceeded = false): T {
  try {
    return decode(value);
  } catch {
    return invalidResponse(writeMayHaveSucceeded);
  }
}

function snapshotReceipt(value: unknown, writeMayHaveSucceeded = false): unknown {
  try { return snapshotPlainData(value); }
  catch { return invalidResponse(writeMayHaveSucceeded); }
}

export function decodeOneResult<T extends BaseRecord>(value: unknown, decode: RecordDecoder<T>, writeMayHaveSucceeded = false): GetOneResult<T> {
  const snapshot = snapshotReceipt(value, writeMayHaveSucceeded);
  if (!oneValidator.Check(snapshot)) return invalidResponse(writeMayHaveSucceeded);
  return { data: decodeRecord(snapshot.data, decode, writeMayHaveSucceeded) };
}

export function decodeManyResult<T extends BaseRecord>(value: unknown, decode: RecordDecoder<T>, writeMayHaveSucceeded = false): GetManyResult<T> {
  const snapshot = snapshotReceipt(value, writeMayHaveSucceeded);
  if (!manyValidator.Check(snapshot)) return invalidResponse(writeMayHaveSucceeded);
  return { data: snapshot.data.map(item => decodeRecord(item, decode, writeMayHaveSucceeded)) };
}

export function decodeListResult<T extends BaseRecord>(value: unknown, decode: RecordDecoder<T>): GetListResult<T> {
  const snapshot = snapshotReceipt(value);
  if (!listValidator.Check(snapshot)) return invalidResponse();
  return { ...snapshot, data: snapshot.data.map(item => decodeRecord(item, decode)) };
}

export function decodeCustomResult(value: unknown, writeMayHaveSucceeded = false): CustomResult {
  if (!customValidator.Check(value)) return invalidResponse(writeMayHaveSucceeded);
  return { data: value.data };
}
