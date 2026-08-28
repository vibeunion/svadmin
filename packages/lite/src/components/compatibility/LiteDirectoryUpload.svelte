<script lang="ts">
  interface Props {
    name?: string;
    label?: string;
    accept?: string;
    disabled?: boolean;
    zipName?: string;
    helpText?: string;
  }

  let {
    name = 'files',
    label = 'Files or folder',
    accept,
    disabled = false,
    zipName = 'archive',
    helpText = 'Select a folder where supported, choose multiple files, or upload a ZIP archive.',
  }: Props = $props();

  const controlId = $props.id();
  const directoryAttributes = { webkitdirectory: true, directory: true };
</script>

<fieldset class="lite-directory-upload">
  <legend>{label}</legend>
  <p class="lite-muted">{helpText}</p>
  <div class="lite-form-group">
    <label for={controlId}>{label}</label>
    <input
      id={controlId}
      class="lite-input"
      type="file"
      {name}
      {accept}
      {disabled}
      multiple
      {...directoryAttributes}
    />
  </div>
  <div class="lite-form-group">
    <label for={`${controlId}-zip`}>ZIP archive fallback</label>
    <input id={`${controlId}-zip`} class="lite-input" type="file" name={zipName} accept=".zip,application/zip" {disabled} />
  </div>
</fieldset>
