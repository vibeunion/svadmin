import { bindResourceRendering, type ResourceRendering } from '../rendering/index.js';
import { captureAdminContext, useOne, useCan, useResourceContract } from '@svadmin/core';

/** Views mount this only when they have an explicit record ID. */
export function useRecordDetail(options: () => { resourceName: string; id: string | number; rendering?: ResourceRendering | undefined }) {
  const context = captureAdminContext();
  const binding = useResourceContract(() => options().resourceName);
  const rendering = $derived(bindResourceRendering(options().rendering, binding.resource));
  const resource = $derived(context.getResource(options().resourceName));
  const permission = useCan(() => ({
    resource: options().resourceName, action: 'show', id: options().id,
    queryOptions: { enabled: resource.canShow !== false },
  }));
  const canRead = $derived(resource.canShow !== false && permission.allowed === true);
  const query = useOne(() => {
    void rendering;
    return {
      resource: binding.resource, id: options().id, dataProviderName: binding.dataProviderName,
      queryOptions: { enabled: canRead },
    };
  });
  return {
    query,
    get rendering() { return rendering; },
    get resource() { return resource; },
    get fields() { return resource.fields.filter(field => field.showInShow !== false); },
    get canRead() { return canRead; },
    get checkingPermission() { return permission.isLoading; },
    async refresh() {
      if (!canRead || query.isFetching) return;
      await query.refetch();
    },
  };
}
