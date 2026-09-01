<script lang="ts">
  import Snippet from './Snippet.svelte';
  import SnippetAddon from './SnippetAddon.svelte';
  import SnippetCopyButton from './SnippetCopyButton.svelte';
  import SnippetInput from './SnippetInput.svelte';
  import SnippetText from './SnippetText.svelte';

  let {
    code,
    oncopy,
    onerror,
  }: {
    code: string;
    oncopy?: () => void;
    onerror?: (error: Error) => void;
  } = $props();
</script>

<Snippet {code}>
  <SnippetAddon><SnippetText>$</SnippetText></SnippetAddon>
  <SnippetInput />
  <SnippetAddon align="inline-end">
    <SnippetCopyButton timeout={10} {oncopy} {onerror} />
  </SnippetAddon>
</Snippet>
