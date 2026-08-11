<script lang="ts">
  interface Props {
    resource: string;
    basePath?: string;
  }

  let { resource, basePath = '/lite' }: Props = $props();
  const target = $derived(`${basePath}/${resource}`);
</script>

<svelte:head>
  <meta http-equiv="refresh" content={`0; url=${target}`} />
</svelte:head>
<p>Redirecting to <a href={target}>{resource}</a>...</p>
