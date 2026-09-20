<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { Value } from '@sinclair/typebox/value';
  import JsonSchemaForm from '@svadmin/ui/components/JsonSchemaForm.svelte';
  import { createSurfaceFormController, type SurfaceWorkflowClientState } from '../workflows/client.js';
  import type { SurfaceWorkflowHost } from '../workflows/context.js';
  import type { SurfaceActionDescriptor } from '../workflows/types.js';
  import type { JsonObject } from '../types.js';
  import { editorClasses, editorButtonClasses } from '../styles/editor.generated.js';
  import '../styles/editor.css';
  let { widgetId, host, action, title, locale }: {
    widgetId: string; host: SurfaceWorkflowHost; action: SurfaceActionDescriptor; title: string; locale: string;
  } = $props();
  const instanceId = $props.id();
  let value = $state<Record<string, unknown>>({});
  let formState = $state<SurfaceWorkflowClientState>({ busy: false });
  let errors = $state<string[]>([]);
  const schema = $derived(JSON.parse(JSON.stringify(action.inputSchema)));
  const zh = $derived(locale.startsWith('zh'));
  const labels = $derived(zh ? {
    submit: '提交操作提案', confirm: '确认这些参数', execute: '执行已批准操作', refresh: '查询状态', reject: '取消提案', reset: '开始新操作',
    disabled: '预览模式：业务操作尚未启用', pending: '等待确认或独立审批', approved: '已批准，尚未执行',
    executing: '正在执行，请勿重复提交', succeeded: '操作已完成', indeterminate: '结果不明确，需要服务端核对，禁止直接重试', rejected: '提案已取消',
    error: '操作未完成。请先查询状态，避免重复执行。', args: '待确认参数',
  } : {
    submit: 'Propose action', confirm: 'Confirm these arguments', execute: 'Execute approved action', refresh: 'Check status', reject: 'Cancel proposal', reset: 'Start another action',
    disabled: 'Preview mode: business actions are disabled', pending: 'Waiting for confirmation or independent approval', approved: 'Approved; not yet executed',
    executing: 'Executing; do not submit again', succeeded: 'Action completed', indeterminate: 'Outcome unknown; server reconciliation is required before retry', rejected: 'Proposal cancelled',
    error: 'Operation did not complete. Check status before retrying.', args: 'Arguments to confirm',
  });
  const scope = $derived(host.getScope());
  const controller = untrack(() => createSurfaceFormController({ action, getScope: host.getScope,
    onState: (next) => { formState = next; }, onCommitted: host.committed }));
  let identity: readonly unknown[] = [];
  $effect.pre(() => {
    const next = [scope.scopeKey, scope.surfaceId, scope.revision, scope.transport, scope.enabled];
    untrack(() => {
      if (identity.length && next.some((part, index) => part !== identity[index])) {
        controller.reset();
        value = {};
        errors = [];
      }
      identity = next;
    });
  });
  onDestroy(() => controller.dispose());
  async function submit(input: Record<string, unknown>) {
    // Optional cleared fields may be undefined in a bound form; omission is the
    // wire representation. The server repeats JSON and schema validation.
    const args: unknown = JSON.parse(JSON.stringify(input));
    if (!Value.Check(action.inputSchema, args)) {
      errors = [...Value.Errors(action.inputSchema, args)].slice(0, 12).map((error) => `${error.path}: ${error.message}`);
      return;
    }
    errors = [];
    await controller.submit(args as JsonObject);
  }
</script>

<section class="svadmin-surface-editor {editorClasses.comfortable}" aria-labelledby="{instanceId}-form-title" aria-busy={formState.busy}>
  <h3 id="{instanceId}-form-title">{title}</h3>
  {#if !scope.enabled}<p role="status">{labels.disabled}</p>{/if}
  {#if errors.length}
    <div role="alert"><ul>{#each errors as error, index (`${index}:${error}`)}<li>{error}</li>{/each}</ul></div>
  {/if}
  <fieldset disabled={!scope.enabled || formState.busy || !!formState.proposal} class="form-fields">
    <JsonSchemaForm {schema} {locale} bind:value onsubmit={submit} submitText={labels.submit} idPrefix={`surface-${widgetId}-${instanceId}`} />
  </fieldset>
  {#if formState.error}<p role="alert">{labels.error}</p>{/if}
  {#if formState.proposal}
    {@const p = formState.proposal}
    <section aria-label={p.actionLabel}>
      <p role="status" data-workflow-status={p.status}>{labels[p.status]}</p>
      <strong>{p.actionLabel}</strong>
      <details><summary>{labels.args}</summary><pre>{JSON.stringify(p.args, null, 2)}</pre></details>
      <div data-part="actions">
        {#if p.status === 'pending' && p.approval === 'confirm'}
          <button class={editorButtonClasses.secondary} disabled={formState.busy || !scope.enabled} onclick={() => controller.confirm()}>{labels.confirm}</button>
        {/if}
        {#if p.status === 'approved'}
          <button class={editorButtonClasses.primary} disabled={formState.busy || !scope.enabled} onclick={() => controller.execute()}>{labels.execute}</button>
        {/if}
        <button class={editorButtonClasses.secondary} disabled={formState.busy || !scope.enabled} onclick={() => controller.refresh()}>{labels.refresh}</button>
        {#if p.status === 'pending' || p.status === 'approved'}
          <button class={editorButtonClasses.secondary} disabled={formState.busy || !scope.enabled} onclick={() => controller.reject()}>{labels.reject}</button>
        {:else if p.status === 'succeeded' || p.status === 'rejected'}
          <button class={editorButtonClasses.secondary} disabled={formState.busy} onclick={() => controller.reset()}>{labels.reset}</button>
        {/if}
      </div>
    </section>
  {/if}
</section>

<style>
  .form-fields { border: 0; padding: 0; margin: 0; min-width: 0; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 16rem; overflow: auto; }
</style>
