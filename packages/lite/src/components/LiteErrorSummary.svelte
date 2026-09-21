<script lang="ts">
  export interface LiteFormErrorEntry {
    fieldKey: string;
    label: string;
    message: string;
    /** 可选的表单控件 id；提供后错误项会链接到该控件。 */
    fieldId?: string;
  }

  let {
    errors = [],
    title = 'Please fix the following errors',
  }: {
    errors?: LiteFormErrorEntry[];
    title?: string;
  } = $props();
</script>

{#if errors.length > 0}
  <section class="lite-error-summary" aria-labelledby="lite-error-summary-title">
    <h2 id="lite-error-summary-title">{title}</h2>
    <ul>
      {#each errors as error (error.fieldKey)}
        <li>
          {#if error.fieldId}
            <a href={`#${error.fieldId}`}>{error.label}: {error.message}</a>
          {:else}
            <span>{error.label}: {error.message}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
