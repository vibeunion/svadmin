import { captureAdminContext } from './context.svelte';
import { resolveResourceContract } from './resource-contract';
import { definedReactiveOptions } from './defined-options';

/** Bind a metadata-driven view to its declared runtime contract and provider route. */
export function useResourceContract(resourceName: () => string) {
  const context = captureAdminContext();
  const definition = () => context.getResource(resourceName());
  return definedReactiveOptions({
    get resource() { return resolveResourceContract(definition()); },
    get dataProviderName() {
      const resource = definition();
      const name = resource.provider?.dataProviderName ?? resource.meta?.dataProviderName ?? 'default';
      context.getDataProvider(name);
      return name;
    },
    get meta() { return context.getProviderMeta(resourceName()); },
  });
}
