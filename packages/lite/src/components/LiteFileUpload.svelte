<script lang="ts">
  interface Props {
    name: string;
    label: string;
    id?: string;
    form?: string;
    accept?: string;
    multiple?: boolean;
    required?: boolean;
    disabled?: boolean;
    /** Explicit undefined clears a previously displayed server error. */
    error?: string | undefined;
    class?: string;
  }

  let {
    name,
    label,
    id,
    form,
    accept,
    multiple = false,
    required = false,
    disabled = false,
    error,
    class: className = '',
  }: Props = $props();

  const generatedId = $props.id();
  const controlId = $derived(id ?? generatedId);
</script>

<div class={`lite-form-group ${className}`}>
  <label for={controlId}>{label}</label>
  <!-- 保留可见原生控件，无客户端脚本时仍可显示浏览器选择状态。 -->
  <input
    type="file"
    id={controlId}
    {name}
    {form}
    {accept}
    {multiple}
    {required}
    {disabled}
    class:lite-input-error={!!error}
    class="lite-input"
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${controlId}-error` : undefined}
  />
  {#if error}
    <p id={`${controlId}-error`} class="lite-error-text" role="alert">{error}</p>
  {/if}
</div>
