<script lang="ts">
  import { Filemanager, Willow, type IApi, type TMode } from '@svar-ui/svelte-filemanager';
  import { Locale } from '@svar-ui/svelte-core';

  export type FileBrowserData = Record<string, unknown>[];
  export type FileBrowserInit = (api: IApi) => void;
  export type FileBrowserMenuOptions = Parameters<typeof Filemanager>[0]['menuOptions'];

  interface Props {
    data?: FileBrowserData;
    mode?: TMode;
    drive?: unknown;
    preview?: boolean;
    panels?: unknown[];
    activePanel?: number;
    readonly?: boolean;
    menuOptions?: FileBrowserMenuOptions;
    extraInfo?: unknown;
    init?: FileBrowserInit;
    icons?: 'simple' | ((file: Record<string, unknown>, size: string) => string | false);
    previews?: unknown;
    words?: Record<string, unknown>;
    fonts?: boolean;
    class?: string;
  }

  let {
    data = [],
    mode = 'table',
    drive = null,
    preview = false,
    panels = [],
    activePanel = 0,
    readonly = false,
    menuOptions,
    extraInfo = null,
    init,
    icons = 'simple',
    previews = null,
    words,
    fonts = false,
    class: className = '',
  }: Props = $props();
</script>

<div class={'svadmin-file-browser ' + className} data-slot="file-browser">
  <Willow {fonts}>
    <Locale {words}>
      <Filemanager
        {data}
        {mode}
        {drive}
        {preview}
        {panels}
        {activePanel}
        {readonly}
        {menuOptions}
        {extraInfo}
        {init}
        {icons}
        {previews}
      />
    </Locale>
  </Willow>
</div>

<style>
  .svadmin-file-browser { min-width: 0; max-width: 100%; overflow: hidden; }
  .svadmin-file-browser :global(.wx-willow-theme) { --wx-font-family: inherit; --wx-fm-box-shadow: none; }
</style>
