<script lang="ts">
  import Input from '../../src/components/ui/input/input.svelte';
  import InputGroup from '../../src/components/InputGroup.svelte';

  let {
    value = $bindable(''),
    invalid = false,
    disabled = false,
  }: {
    value?: string;
    invalid?: boolean;
    disabled?: boolean;
  } = $props();
</script>

<InputGroup addBefore="https://" addAfter=".com" {invalid} {disabled} label="Domain">
  <Input bind:value aria-label="Domain" placeholder="example" {disabled} aria-invalid={invalid ? 'true' : undefined} />
</InputGroup>