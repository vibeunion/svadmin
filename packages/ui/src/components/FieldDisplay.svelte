<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { getDisplayComponent, type FieldDisplayProps } from './fieldComponentMap';

  let { type, value, options, resourceName }: FieldDisplayProps & { type: string } = $props();
  const Display = $derived(getDisplayComponent(type));
  const i18n = useTranslation();
</script>

{#if Display}
  <Display {value} {options} {resourceName} />
{:else}
  <span role="status" data-svadmin-invalid-field>{i18n.t('validation.invalidFormat')}</span>
{/if}
