<script lang="ts">
  import ModalForm from './ModalForm.svelte';
  import DrawerForm from './DrawerForm.svelte';

  let {
    kind = 'modal',
    open = $bindable(false),
    disabled = false,
    isSubmitting = false,
    onsubmit,
    oncancel,
  }: {
    kind?: 'modal' | 'drawer';
    open?: boolean;
    disabled?: boolean;
    isSubmitting?: boolean;
    onsubmit?: () => void | Promise<void>;
    oncancel?: () => void;
  } = $props();

  let draft = $state('Initial draft');
</script>

{#if kind === 'modal'}
  <ModalForm
    bind:open
    {disabled}
    {isSubmitting}
    {onsubmit}
    {oncancel}
    title="Test form"
    submitText="Save"
    cancelText="Cancel"
  >
    <label for="modal-drawer-draft">Draft</label>
    <input id="modal-drawer-draft" bind:value={draft} />
  </ModalForm>
{:else}
  <DrawerForm
    bind:open
    {disabled}
    {isSubmitting}
    {onsubmit}
    {oncancel}
    title="Test form"
    submitText="Save"
    cancelText="Cancel"
  >
    <label for="modal-drawer-draft">Draft</label>
    <input id="modal-drawer-draft" bind:value={draft} />
  </DrawerForm>
{/if}
