import { captureAdminContext } from './context.svelte';
import { keys } from './query-keys';
import { contractKey, contractProvider, type ResourceContract } from './resource-contract';
import { replaceReactiveMembers } from './reactive-projection';
import { definedOptions } from './defined-options';

export interface ContractOptions {
  /** @internal Installed by the public contract-bound hooks. */
  contract?: ResourceContract;
}

export function captureContractContext(options: ContractOptions | (() => ContractOptions)) {
  const context = captureAdminContext();
  const current = () => (typeof options === 'function' ? options() : options).contract;
  return replaceReactiveMembers(context, {
    getDataProviderForResource(resource: string, name?: string) {
      const provider = context.getDataProviderForResource(resource, name);
      const contract = current();
      return contract ? contractProvider(provider, contract) : provider;
    },
    queryKeys(resource?: string, name?: string) {
      const builder = context.queryKeys(resource, name);
      const contract = current();
      if (!contract) return builder;
      const descriptor = builder.data.list(resource ?? '')[0];
      return keys(definedOptions({
        provider: descriptor.provider, tenant: descriptor.tenant, contract: contractKey(contract),
        resource: descriptor.resource, id: descriptor.id, params: descriptor.params, method: descriptor.method,
      }));
    },
    queryKeyMatcher(resource?: string, name?: string) {
      const matcher = context.queryKeyMatcher(resource, name);
      const contract = current();
      return contract ? { ...matcher, contract: contractKey(contract) } : matcher;
    },
  });
}
