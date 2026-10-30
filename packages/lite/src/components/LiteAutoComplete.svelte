<script lang="ts">
  interface Props {
    name: string;
    options: string[];
    value?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    listId?: string;
  }

  let {
    name,
    options,
    value = '',
    label,
    placeholder = 'Type or choose a suggestion',
    required = false,
    disabled = false,
    listId = `${name}-options`,
  }: Props = $props();
</script>

<label class="lite-form-group">
  {#if label}<span>{label}</span>{/if}
  <input
    class="lite-input"
    type="text"
    {name}
    {value}
    {placeholder}
    {required}
    {disabled}
    list={listId}
    autocomplete="off"
  />
  <datalist id={listId}>
    {#each options as option (option)}<option value={option}></option>{/each}
  </datalist>
</label>
