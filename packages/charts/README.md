# @svadmin/charts

Optional advanced chart package built on [LayerChart](https://layerchart.com).

```bash
bun add @svadmin/charts layerchart
```

```svelte
<script lang="ts">
  import { TreemapChart, SankeyChart } from '@svadmin/charts';
</script>

<TreemapChart
  data={{ name: 'Revenue', children: [
    { name: 'Cloud', value: 70 },
    { name: 'Services', value: 30 },
  ] }}
/>

<SankeyChart
  data={{
    nodes: [{ id: 'visit', label: 'Visit' }, { id: 'paid', label: 'Paid' }],
    links: [{ source: 'visit', target: 'paid', value: 42 }],
  }}
/>
```

The package is optional: `layerchart` is a peer dependency and is not loaded by `@svadmin/ui`.
