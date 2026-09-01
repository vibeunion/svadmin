<script lang="ts">
  let { label = '' }: { label?: string } = $props();
</script>

<form data-testid="custom-form-card">
  <label>
    <span>{label}</span>
    <input name="customRole" value="generated" />
  </label>
  <button type="submit">Submit custom</button>
</form>
