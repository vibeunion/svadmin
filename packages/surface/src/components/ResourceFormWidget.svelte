<script lang="ts">
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { getSurfaceWorkflowHost } from '../workflows/context.js';
  import ResourceFormBody from './ResourceFormBody.svelte';
  let { widgetId, props, locale = 'en-US' }: SurfaceWidgetRendererProps = $props();
  const host = getSurfaceWorkflowHost();
  const action = $derived(host?.getAction(String(props['actionId'])));
  const zh = $derived(locale.startsWith('zh'));
</script>

{#if host && action}
  {#key `${action.id}:${action.version}`}
    <ResourceFormBody {widgetId} {host} {action} title={typeof props['title'] === 'string' ? props['title'] : action.label} {locale} />
  {/key}
{:else}
  <section role="status" data-surface-form-unavailable>
    {zh ? '该表单尚未连接到已授权的业务操作。' : 'This form is not connected to an authorized business action.'}
  </section>
{/if}
