<script lang="ts">
  interface Props {
    basePath?: string;
    defaultResource?: string;
  }

  let { basePath = '/lite', defaultResource = '' }: Props = $props();
  const target = $derived(`${basePath}${defaultResource ? '/' + defaultResource : ''}`);
</script>

<svelte:head>
  <meta http-equiv="refresh" content={`0; url=${target}`} />
</svelte:head>
<p>Redirecting to <a href={target}>{target}</a>...</p>
