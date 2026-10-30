<script lang="ts">
  interface Props {
    title?: string;
    kind?: string;
    columns?: string[];
    rows?: Array<Array<string | number>>;
    emptyText?: string;
  }

  let {
    title,
    kind = 'chart',
    columns = ['Label', 'Value'],
    rows = [],
    emptyText = 'No data',
  }: Props = $props();
</script>

<section class="lite-chart-table lite-card" data-kind={kind} aria-label={title ?? `${kind} data`}>
  {#if title}<h2>{title}</h2>{/if}
  {#if rows.length === 0}
    <p class="lite-muted">{emptyText}</p>
  {:else}
    <div class="lite-table-scroll">
      <table class="lite-table">
        <thead>
          <tr>{#each columns as column (column)}<th scope="col">{column}</th>{/each}</tr>
        </thead>
        <tbody>
          {#each rows as row, index (index)}
            <tr>{#each row as cell, cellIndex (cellIndex)}<td>{cell}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .lite-chart-table { padding: 0; overflow: hidden; }
  .lite-chart-table h2 { margin: 0; padding: 12px 16px; border-bottom: 1px solid #E5E6EB; color: #1D2129; font-size: 14px; }
  .lite-chart-table > p { margin: 0; padding: 16px; }
  .lite-chart-table table { margin: 0; }
</style>
