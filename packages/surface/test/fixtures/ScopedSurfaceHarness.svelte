<script lang="ts">
  import { provideAdminContext } from '@svadmin/core';
  import type { AccessControlProvider, DataProvider } from '@svadmin/core';
  import SurfaceRenderer from '../../src/components/SurfaceRenderer.svelte';
  import type { ComponentProps } from 'svelte';
  import type { SurfacePolicy } from '../../src/types.js';

  let { dataProvider, accessControlProvider, spec, policy, tenant = 'alpha', onError }: {
    dataProvider: DataProvider;
    accessControlProvider: AccessControlProvider | null;
    spec: unknown;
    policy: SurfacePolicy;
    tenant?: string;
    onError?: ComponentProps<typeof SurfaceRenderer>['onError'];
  } = $props();

  provideAdminContext({
    get dataProvider() { return dataProvider; },
    get accessControlProvider() { return accessControlProvider; },
    get tenant() { return { tenantId: tenant }; },
    resources: [],
  });
</script>

<SurfaceRenderer {spec} {policy} {...(onError === undefined ? {} : { onError })} />
