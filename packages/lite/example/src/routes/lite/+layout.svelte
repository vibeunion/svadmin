<script lang="ts">
  import type { Snippet } from 'svelte';
  import { LiteLayout } from '@svadmin/lite';
  import '@svadmin/lite/lite.css';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<LiteLayout
  resources={data.resources}
  menu={data.menu}
  currentResource={data.currentResource}
  brandName="Lite SSR"
  basePath="/lite"
>
  {@render children()}
</LiteLayout>
