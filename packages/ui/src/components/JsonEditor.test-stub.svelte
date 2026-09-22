<script lang="ts">
  let {
    content = { json: undefined },
    onChange,
  } = $props<{
    content?: { json?: unknown };
    onChange?: (updated: { content: { json?: unknown } }) => void;
  }>();

  const text = $derived(JSON.stringify(content.json ?? null, null, 2));

  function emit(next: string): void {
    try {
      onChange?.({ content: { json: JSON.parse(next) } });
    } catch {
      // Ignore invalid JSON so the stub stays a faithful, non-throwing mock.
    }
  }
</script>

<textarea
  data-testid="mock-jsoneditor"
  value={text}
  oninput={(event) => emit((event.currentTarget as HTMLTextAreaElement).value)}
></textarea>