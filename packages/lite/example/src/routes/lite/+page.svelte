<script lang="ts">
  import {
    LiteAlert,
    LiteLayout,
    LiteSearch,
    LiteTable,
  } from '@svadmin/lite';
  import { postsResource } from '$lib/admin';

  let { data, form }: import('./$types').PageProps = $props();
</script>

<LiteLayout resources={[postsResource]} currentResource="posts" brandName="Lite SSR">
  <div class="lite-header">
    <h1>Posts</h1>
  </div>

  {#if form?.success}
    <LiteAlert type="success" message="Post deleted" />
  {:else if form?.error}
    <LiteAlert type="error" message={form.error} />
  {/if}

  <LiteSearch value={data.searchTerm} />
  <LiteTable
    records={data.posts}
    resource={postsResource}
    currentSearch={data.searchTerm}
    canShow={false}
    canEdit={false}
  />
</LiteLayout>
