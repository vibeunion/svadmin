<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'type' | 'value' | 'files'> & {
    files?: FileList;
    label?: string;
    class?: string;
    webkitdirectory?: boolean;
    directory?: boolean;
  };

  let {
    files = $bindable(),
    label,
    class: className = '',
    ...restProps
  }: Props = $props();

  const selectedFiles = $derived(files ? Array.from(files) : []);
  const selectedLabel = $derived.by(() => {
    const firstFile = selectedFiles[0];
    if (firstFile === undefined) return t('common.noFileChosen') || 'No file chosen';
    if (selectedFiles.length === 1) return firstFile.name;
    return t('common.filesSelected', { count: selectedFiles.length }) || `${selectedFiles.length} files selected`;
  });
</script>

<span class={`lite-file-picker ${className}`} data-disabled={restProps.disabled ? 'true' : undefined}>
  <input
    class="lite-file-picker__native"
    type="file"
    bind:files
    {...restProps}
  />
  <span class="lite-file-picker__visual" aria-hidden="true">
    <span class="lite-file-picker__button">{label ?? (t('common.chooseFile') || 'Choose file')}</span>
    <span class="lite-file-picker__name">{selectedLabel}</span>
  </span>
</span>
