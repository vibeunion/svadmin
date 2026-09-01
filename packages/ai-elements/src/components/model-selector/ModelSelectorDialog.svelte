<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { ModelSelectorContentProps } from './ModelSelectorContent.svelte';

  export type ModelSelectorDialogProps = Omit<ModelSelectorContentProps, 'children'> & {
    open?: boolean;
    defaultOpen?: boolean;
    children?: Snippet;
    onopenchange?: (open: boolean) => void;
  };
</script>

<script lang="ts">
  import ModelSelector from './ModelSelector.svelte';
  import ModelSelectorContent from './ModelSelectorContent.svelte';

  let {
    defaultOpen = false,
    open = $bindable(defaultOpen),
    children,
    onopenchange,
    ...rest
  }: ModelSelectorDialogProps = $props();
</script>

<ModelSelector bind:open {defaultOpen} {onopenchange}>
  <ModelSelectorContent {...rest}>
    {@render children?.()}
  </ModelSelectorContent>
</ModelSelector>
