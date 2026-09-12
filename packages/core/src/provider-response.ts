import type { DataProvider } from './types';
import { decodeBaseRecord, decodeOneResult, decodeManyResult, decodeListResult, decodeCustomResult } from './record-decoder';

type UntrustedResponse<F> = F extends (...params: infer P) => Promise<unknown>
  ? (...params: P) => Promise<unknown> : F;

/** Transport implementations cannot claim a response shape before validation. */
export type DataTransport = { [K in keyof DataProvider]: UntrustedResponse<DataProvider[K]> };

export function withValidatedResponses(transport: DataTransport): DataProvider {
  const {
    getMany: rawGetMany, createMany: rawCreateMany, updateMany: rawUpdateMany,
    deleteMany: rawDeleteMany, custom: rawCustom, ...required
  } = transport;
  const provider: DataProvider = {
    ...required,
    getApiUrl: () => transport.getApiUrl(),
    getList: async params => decodeListResult(await transport.getList(params), decodeBaseRecord),
    getOne: async params => decodeOneResult(await transport.getOne(params), decodeBaseRecord),
    create: async params => decodeOneResult(await transport.create(params), decodeBaseRecord, true),
    update: async params => decodeOneResult(await transport.update(params), decodeBaseRecord, true),
    deleteOne: async params => decodeOneResult(await transport.deleteOne(params), decodeBaseRecord, true),
  };
  const getMany = rawGetMany?.bind(transport);
  if (getMany) provider.getMany = async params => decodeManyResult(await getMany(params), decodeBaseRecord);
  const createMany = rawCreateMany?.bind(transport);
  if (createMany) provider.createMany = async params => decodeManyResult(await createMany(params), decodeBaseRecord, true);
  const updateMany = rawUpdateMany?.bind(transport);
  if (updateMany) provider.updateMany = async params => decodeManyResult(await updateMany(params), decodeBaseRecord, true);
  const deleteMany = rawDeleteMany?.bind(transport);
  if (deleteMany) provider.deleteMany = async params => decodeManyResult(await deleteMany(params), decodeBaseRecord, true);
  const custom = rawCustom?.bind(transport);
  if (custom) provider.custom = async params => decodeCustomResult(await custom(params), params.method !== 'get');
  return provider;
}
