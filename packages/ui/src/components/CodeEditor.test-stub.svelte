<script lang="ts">
  let {
    value = '',
    placeholder,
    readonly = false,
    disabled = false,
    onchange,
  } = $props<{
    value?: string;
    placeholder?: string;
    readonly?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }>();
</script>

<textarea
  data-testid="mock-codemirror"
  {placeholder}
  {readonly}
  {disabled}
  value={value}
  oninput={(event) => onchange?.((event.currentTarget as HTMLTextAreaElement).value)}
></textarea>