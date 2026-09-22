<script lang="ts">
  import { untrack } from 'svelte';
  import { provideResourceScope, type ResourceScope } from './resource-scope.svelte';
  import ResourceScopeTestProbe from './resource-scope.test-probe.svelte';

  interface Props {
    scope: ResourceScope;
  }

  let { scope }: Props = $props();

  untrack(() => provideResourceScope(scope));
</script>

<ResourceScopeTestProbe />