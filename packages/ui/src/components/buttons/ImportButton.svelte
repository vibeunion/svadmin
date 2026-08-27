<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useImport, useCan, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Upload } from '@lucide/svelte';
  import type { ButtonAccessControl } from './access-control';

  const i18n = useTranslation();

  let {
    resource,
    label,
    children,
    hideText = false,
    onFinish,
    accessControl = { enabled: true, hideIfUnauthorized: true },
    class: className = '',
  } = $props<{
    resource: string;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    onFinish?: (result: { succeeded: unknown[]; errored: { request: unknown; error: unknown }[] }) => void;
    accessControl?: ButtonAccessControl;
    class?: string;
  }>();

  let fileInput: HTMLInputElement | undefined = $state();

  const importHook = useImport({
    get resource() { return resource; },
    onFinish: (result) => onFinish?.(result),
  });

  const can = useCan(() => ({
    resource,
    action: 'import',
    params: accessControl?.params,
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true },
  }));
  const hidden = $derived(accessControl?.hideIfUnauthorized && !can.allowed);

  function triggerImport() {
    fileInput?.click();
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      importHook.handleChange({ file });
      input.value = ''; // reset for re-import
    }
  }

  const displayText = $derived(label ?? i18n.t('common.import'));
</script>

{#if !hidden}
  <input
    type="file"
    accept=".csv,.json,.xlsx"
    class="hidden"
    bind:this={fileInput}
    onchange={handleFileChange}
  />
  <Button
    variant="outline"
    size={hideText ? 'icon' : 'sm'}
    class={className}
    disabled={importHook.isLoading || !can.allowed}
    onclick={triggerImport}
  >
    <Upload class="h-4 w-4" />
    {#if !hideText}
      <span class="ml-1">
        {#if children}
          {@render children()}
        {:else}
          {displayText}
        {/if}
      </span>
    {/if}
  </Button>
{/if}
