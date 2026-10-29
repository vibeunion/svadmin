<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  export interface FormErrorEntry {
    fieldKey: string;
    label: string;
    message: string;
  }

  let {
    errors = [],
    title,
    id,
    onfocusfield,
  } = $props<{
    errors?: FormErrorEntry[];
    title?: string;
    id?: string;
    onfocusfield?: (fieldKey: string) => void;
  }>();

  const generatedId = $props.id();
  const headingId = $derived(`${id ?? generatedId}-title`);
  const resolvedTitle = $derived(title ?? i18n.t('common.formErrors'));
</script>

{#if errors.length > 0}
  <div
    class="border-destructive"
    data-svadmin-error-summary
    role="region"
    aria-labelledby={headingId}
    aria-live="polite"
    aria-atomic="true"
  >
    <h2 id={headingId} class="font-medium">{resolvedTitle}</h2>
    <ul>
      {#each errors as error, index (`${error.fieldKey}-${index}`)}
        <li>
          {#if onfocusfield}
            <button
              type="button"
              class="text-foreground"
              onclick={() => onfocusfield?.(error.fieldKey)}
            >
              {error.label}: {error.message}
            </button>
          {:else}
            <span>{error.label}: {error.message}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
