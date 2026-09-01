<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type MicSelectorProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    value?: string;
    defaultValue?: string;
    open?: boolean;
    defaultOpen?: boolean;
    class?: string;
    children?: Snippet;
    onvaluechange?: (value: string) => void;
    onopenchange?: (open: boolean) => void;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { provideMicSelectorContext } from './context.svelte.js';
  import { useAudioDevices } from './useAudioDevices.svelte.js';

  let {
    defaultValue,
    value = $bindable(defaultValue ?? ''),
    defaultOpen = false,
    open = $bindable(defaultOpen),
    class: className = '',
    children,
    onvaluechange,
    onopenchange,
    ...rest
  }: MicSelectorProps = $props();

  const audioDevices = useAudioDevices();
  let permissionRequested = false;

  function setOpen(nextOpen: boolean): void {
    if (open === nextOpen) return;
    open = nextOpen;
    onopenchange?.(nextOpen);
    if (nextOpen && !permissionRequested) {
      permissionRequested = true;
      void audioDevices.loadDevices();
    }
  }

  function setValue(nextValue: string): void {
    value = nextValue;
    onvaluechange?.(nextValue);
    setOpen(false);
  }

  provideMicSelectorContext({
    get devices() { return audioDevices.devices; },
    get value() { return value; },
    get open() { return open; },
    get loading() { return audioDevices.loading; },
    get error() { return audioDevices.error; },
    setValue,
    setOpen,
  });
</script>

<div class={cn('svadmin-ai svadmin-ai-mic-selector', className)} data-open={open} {...rest}>
  {@render children?.()}
</div>

<style>
  .svadmin-ai-mic-selector { position: relative; }
</style>
