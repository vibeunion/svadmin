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
    title = i18n.t('common.formErrors'),
    id,
    onfocusfield,
  } = $props<{
    errors?: FormErrorEntry[];
    title?: string;
    id?: string;
    onfocusfield?: (fieldKey: string) => void;
  }>();

  const headingId = $derived(id ? `${id}-title` : undefined);
</script>

{#if errors.length > 0}
  <div
    class="svadmin-u-ee1a5af3aa10"
    role="region"
    aria-labelledby={headingId}
  >
    <h2 id={headingId} class="svadmin-u-2689f3958069">{title}</h2>
    <ul>
      {#each errors as error (error.fieldKey)}
        <li>
          {#if onfocusfield}
            <button
              type="button"
              class="svadmin-u-d4108abe6359"
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
