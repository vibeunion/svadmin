<script lang="ts">
  interface Props {
    value: string;
    label?: string;
    rows?: number;
  }

  let { value, label = 'Copy value', rows = 4 }: Props = $props();
  const controlId = $props.id();
</script>

<div class="lite-form-group lite-clipboard-fallback">
  <label for={controlId}>{label}</label>
  <textarea id={controlId} class="lite-input" readonly {rows}>{value}</textarea>
  <p class="lite-muted">Select the text and use the browser command for manual copy.</p>
</div>
