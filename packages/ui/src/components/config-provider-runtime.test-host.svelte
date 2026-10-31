<script lang="ts">
  import Calendar from './Calendar.svelte';
  import ConfigProvider, { type ComponentConfig } from './ConfigProvider.svelte';
  import DatePicker from './DatePicker.svelte';
  import Tag from './Tag.svelte';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';

  let {
    density = 'default',
    direction = 'ltr',
    locale = 'en',
    componentSize = 'md',
    dateLocale,
  }: Pick<ComponentConfig, 'density' | 'direction' | 'locale' | 'componentSize'> & {
    dateLocale?: string;
  } = $props();
</script>

<ConfigProvider {density} {direction} {locale} {componentSize}>
  <Button>Action</Button>
  <Button size="lg">Pinned</Button>
  <Input aria-label="Name" />
  <Select aria-label="Choice"><option value="open">Open</option></Select>
  <Badge>Status</Badge>
  <Tag>Label</Tag>
  <Calendar value="2026-10-15" />
  <!-- 未传入时不要把 undefined 写进可选 locale，exactOptionalPropertyTypes 只接受缺省或 string。 -->
  {#if dateLocale !== undefined}
    <DatePicker panel value="2026-09-20" locale={dateLocale} />
  {:else}
    <DatePicker panel value="2026-09-20" />
  {/if}
</ConfigProvider>
