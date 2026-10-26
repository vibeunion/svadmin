<script lang="ts">
  import FieldRenderer from '../../src/components/FieldRenderer.svelte';
  import type { UploadHandler } from '../../src/components/file-upload-types.js';

  let { upload, onState }: {
    upload: UploadHandler;
    onState: (state: { busy: boolean; unresolved: boolean }) => void;
  } = $props();
  let value = $state<unknown>([{}, {}]);
</script>

<FieldRenderer
  field={{ key: 'rows', label: 'Rows', type: 'array',
    subFields: [{ key: 'attachment', label: 'Attachment', type: 'file' }] }}
  {value}
  {upload}
  fileReferenceMode
  onUploadStateChange={onState}
  onchange={next => { value = next; }}
/>
