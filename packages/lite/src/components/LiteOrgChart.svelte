<script lang="ts">
  export interface LiteOrgNode {
    id: string;
    name: string;
    title?: string;
    department?: string;
    href?: string;
    children?: LiteOrgNode[];
  }

  interface Props {
    data?: LiteOrgNode | LiteOrgNode[];
    title?: string;
    emptyText?: string;
    class?: string;
  }

  let {
    data = [],
    title = 'Organization chart',
    emptyText = 'No organization data',
    class: className = '',
  }: Props = $props();

  interface FlatNode {
    node: LiteOrgNode;
    depth: number;
  }

  function flatten(nodes: LiteOrgNode[], depth = 0, out: FlatNode[] = []): FlatNode[] {
    for (const node of nodes) {
      out.push({ node, depth });
      if (node.children?.length) flatten(node.children, depth + 1, out);
    }
    return out;
  }

  const rows = $derived(flatten(Array.isArray(data) ? data : [data]));
</script>

<section class="lite-org-chart lite-card {className}" aria-label={title}>
  <h2>{title}</h2>
  {#if rows.length === 0}
    <p class="lite-org-empty">{emptyText}</p>
  {:else}
    <table class="lite-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Title</th>
          <th>Department</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.node.id)}
          <tr data-depth={row.depth}>
            <td>
              <span class="lite-org-indent" style={`padding-left:${row.depth * 16}px`}>
                {#if row.depth > 0}<span class="lite-org-branch" aria-hidden="true">└</span>{/if}
                {#if row.node.href}<a href={row.node.href}>{row.node.name}</a>{:else}{row.node.name}{/if}
              </span>
            </td>
            <td>{row.node.title ?? '—'}</td>
            <td>{row.node.department ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .lite-org-chart { padding: 16px; }
  .lite-org-chart h2 { margin: 0 0 12px; color: #1d2129; font-size: 16px; }
  .lite-org-empty { margin: 0; padding: 20px; color: #86909c; text-align: center; }
  .lite-org-indent { display: inline-block; }
  .lite-org-branch { display: inline-block; margin-right: 4px; color: #86909c; }
</style>
