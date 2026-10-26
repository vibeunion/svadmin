<script lang="ts">
  import LazyPage from '@svadmin/ui/components/LazyPage.svelte';

  let { route = '/workspace', params = {} }: {
    route?: string;
    params?: Record<string, string | undefined>;
  } = $props();

  const loader = () => import('../features/workspace/index.js').then((module) => module.loadWorkspaceTabsPage());
</script>

<LazyPage {loader} props={{ route, params }} />
