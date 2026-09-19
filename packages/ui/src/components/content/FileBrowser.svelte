<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import { Filemanager, Willow } from '@svar-ui/svelte-filemanager';
  import { Locale } from '@svar-ui/svelte-core';

  export type FileBrowserData = ComponentProps<typeof Filemanager>['data'];
  export type FileBrowserInit = ComponentProps<typeof Filemanager>['init'];
  export type FileBrowserMenuOptions = ComponentProps<typeof Filemanager>['menuOptions'];
  export type FileBrowserProps = ComponentProps<typeof Filemanager> & {
    words?: ComponentProps<typeof Locale>['words'];
    fonts?: boolean;
    class?: string;
  };
</script>

<script lang="ts">
  let {
    words, fonts = false, class: className = '',
    mode = 'table', icons = 'simple', readonly = true,
    ...managerProps
  }: FileBrowserProps = $props();
</script>

<div class={'svadmin-file-browser ' + className} data-slot="file-browser">
  <Willow {fonts}>
    <Locale words={words ?? {}}>
      <Filemanager {...managerProps} {mode} {icons} {readonly} />
    </Locale>
  </Willow>
</div>

<style>
  .svadmin-file-browser { height: 32rem; min-width: 0; max-width: 100%; overflow: hidden; }
  .svadmin-file-browser :global(.wx-willow-theme) { --wx-font-family: inherit; --wx-fm-box-shadow: none; }
</style>
