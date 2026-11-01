<script lang="ts">
  import ConfigProvider, { type GetPopupContainer } from './ConfigProvider.svelte';
  import * as Dialog from './ui/dialog/index.js';
  import * as Popover from './ui/popover/index.js';
  import * as Tooltip from './ui/tooltip/index.js';
  import { Root as Sheet } from './ui/sheet/index.js';

  let {
    calls = [],
    useCustomContainer = true,
  }: {
    calls?: Array<HTMLElement | null | undefined>;
    useCustomContainer?: boolean;
  } = $props();

  const getPopupContainer: GetPopupContainer = (node) => {
    calls.push(node);
    if (typeof document === 'undefined') return undefined;
    return node?.closest('.workspace') ?? undefined;
  };
</script>

<ConfigProvider {...useCustomContainer ? { getPopupContainer } : {}}>
  <div class="workspace" data-testid="workspace-a">
    <Dialog.Root open>
      <Dialog.Trigger>Open dialog</Dialog.Trigger>
      <Dialog.Content>Dialog body</Dialog.Content>
    </Dialog.Root>
    <Tooltip.Root open>
      <Tooltip.Trigger>Open tooltip</Tooltip.Trigger>
      <Tooltip.Content>Tooltip body</Tooltip.Content>
    </Tooltip.Root>
  </div>
  <div class="workspace" data-testid="workspace-b">
    <Popover.Root open>
      <Popover.Trigger>Open popover</Popover.Trigger>
      <Popover.Content>Popover body</Popover.Content>
    </Popover.Root>
    <Sheet open>Sheet body</Sheet>
  </div>
</ConfigProvider>
