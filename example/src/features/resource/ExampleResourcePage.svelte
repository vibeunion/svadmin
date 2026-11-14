<!-- // @vibe-escape: Level 2 Snippet Slots / specialized layout operations cockpit -->
<script lang="ts">
  import { demoRendering } from '../../resource-rendering';
  import { definedOptions } from '@svadmin/core/options';
  import { getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ResourceOperationsPage } from '@svadmin/ui';
  import { readHashView } from '../../utils/hashView';
  import {
    configFor,
    localizeText,
    resourceDescription,
    viewOverride,
  } from './resource-page-configs';

  let { resourceName }: { resourceName: string } = $props();
  let activeView = $state(readHashView('default'));

  const i18n = useTranslation();
  const locale = $derived(i18n.locale);
  const resource = $derived(getResource(resourceName));

  const config = $derived(configFor(resourceName));
  const baseCopy = $derived(locale === 'zh-CN' ? config.zh : config.en);
  const copy = $derived.by(() => {
    const label = resource.label;
    const override = viewOverride(resourceName, activeView, locale);
    return {
      ...baseCopy,
      title: override?.title ?? label,
      description: override?.description ?? resourceDescription(resourceName, label, locale),
      actionLabel: override?.actionLabel ?? (locale === 'zh-CN' ? `新建${label}` : `New ${label}`),
      tableLabel: label,
      tableDescription: override?.tableDescription ?? (locale === 'zh-CN'
        ? `使用表格维护${label}数据，覆盖查询、新建、编辑、详情和删除流程。`
        : `Use the table to maintain ${label} data across list, create, edit, show, and delete flows.`),
    };
  });
  const metrics = $derived(config.metrics.map((metric) => definedOptions({
    ...metric,
    label: localizeText(metric.label, locale) ?? metric.label,
    hint: localizeText(metric.hint, locale),
  })));
  const lanes = $derived(config.lanes.map((lane) => definedOptions({
    ...lane,
    label: localizeText(lane.label, locale) ?? lane.label,
    hint: localizeText(lane.hint, locale),
  })));
  const highlights = $derived(config.highlights.map((item) => definedOptions({
    ...item,
    title: localizeText(item.title, locale) ?? item.title,
    description: localizeText(item.description, locale),
    meta: localizeText(item.meta, locale),
    badge: localizeText(item.badge, locale),
  })));

  function syncView(): void {
    activeView = readHashView('default');
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

<div data-app-page="resource-operations" data-resource-name={resourceName} data-resource-view={activeView}
  data-svadmin-component="ExampleResourcePage"
  data-svadmin-resource={resourceName}>
  <ResourceOperationsPage
    rendering={demoRendering(resourceName)}
    {resourceName}
    eyebrow={copy.eyebrow}
    title={copy.title}
    {...definedOptions({ "description": copy.description })}
    actionLabel={copy.actionLabel}
    icon={config.icon}
    {metrics}
    {lanes}
    {highlights}
    tableLabel={copy.tableLabel}
    tableDescription={copy.tableDescription}
    highlightsLabel={copy.highlightsLabel}
    emptyLanesText={locale === 'zh-CN' ? '暂无分组记录。' : 'No grouped records yet.'}
    workspaceStyle={config.workspaceStyle}
  />
</div>
