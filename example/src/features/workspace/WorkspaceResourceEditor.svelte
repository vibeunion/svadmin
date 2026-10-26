<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import AutoForm from '@svadmin/ui/components/AutoForm.svelte';
  import { schemaFormSnapshot } from '@svadmin/ui/components/json-schema-form-state.js';
  import { demoRendering } from '../../resource-rendering';

  type NavigationGuard = (fn: () => void) => void;

  interface Props {
    resourceName: string;
    recordId: string;
    draftFields?: readonly string[];
    onDraftChange?: (draft: Record<string, unknown> | undefined, token: symbol) => void;
    onSaved?: () => void;
    onDirtyChange: (dirty: boolean) => void;
    onNavigationGuardReady: (guard: NavigationGuard) => void;
    onCancel: () => void;
  }

  let {
    resourceName,
    recordId,
    draftFields,
    onDraftChange,
    onSaved,
    onDirtyChange,
    onNavigationGuardReady,
    onCancel,
  }: Props = $props();

  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  const adminContext = captureAdminContext();
  const rendering = $derived(demoRendering(resourceName));

  const DRAFT_BASELINE_KEY = '__workspaceDraftBaseline';
  // 未显式声明的表单不提供草稿，绝不按字段类型自动扩散。
  const effectiveDraftFields: readonly string[] = $derived.by(() => {
    const provided = draftFields;
    if (!provided || provided.length === 0) return [];
    const definition = adminContext.getResource(resourceName);
    const primaryKey = definition.primaryKey ?? 'id';
    const available = new Set(definition.fields.map(field => field.key));
    return [...new Set(provided)].filter(key => key !== primaryKey && available.has(key));
  });

  let dirty = $state(false);
  let conflict = $state(false);
  let restoreError = $state(false);
  let baseline: Record<string, unknown> | undefined;
  let autoForm = $state.raw<{ restoreDraft(candidate: Record<string, unknown>): boolean }>();
  const draftToken = Symbol('workspace-editor');

  export function getDraftToken(): symbol {
    return draftToken;
  }

  function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function stableValue(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
    if (isPlainRecord(value)) {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? 'undefined';
  }

  function sameDraft(left: unknown, right: unknown): boolean {
    return stableValue(left) === stableValue(right);
  }

  function declaredDraft(data: Record<string, unknown>): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const key of effectiveDraftFields) {
      if (Object.prototype.hasOwnProperty.call(data, key)) values[key] = data[key];
    }
    return values;
  }

  function setDirty(next: boolean): void {
    if (dirty === next) return;
    dirty = next;
    onDirtyChange(next);
  }

  function handleAutoDraft(draft: Record<string, unknown> | undefined): void {
    if (draft === undefined) return;
    if (!baseline) baseline = declaredDraft(draft);
    const payload = declaredDraft(draft);
    payload[DRAFT_BASELINE_KEY] = baseline;
    onDraftChange?.(payload, draftToken);
  }

  /**
   * 仅由宿主在用户显式确认后调用。候选先做整体纯 JSON 快照，基线只比较声明的
   * 字段集合；通过后交给 AutoForm 的实例入口原子写入，失败返回 false 并显示提示。
   */
  export function restoreDraft(candidate: Record<string, unknown>): boolean {
    try {
      if (!baseline) {
        restoreError = true;
        return false;
      }
      let snapshot: Record<string, unknown>;
      try {
        snapshot = schemaFormSnapshot(candidate);
      } catch {
        restoreError = true;
        return false;
      }
      const storedBaseline = snapshot[DRAFT_BASELINE_KEY];
      if (
        !isPlainRecord(storedBaseline) ||
        !sameDraft(declaredDraft(storedBaseline), baseline)
      ) {
        conflict = true;
        restoreError = false;
        return false;
      }
      const allowlist = new Set(effectiveDraftFields);
      const values: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(snapshot)) {
        if (key === DRAFT_BASELINE_KEY) continue;
        if (!allowlist.has(key)) {
          restoreError = true;
          conflict = false;
          return false;
        }
        values[key] = value;
      }
      if (Object.keys(values).length === 0) return false;
      const restored = autoForm?.restoreDraft(values) ?? false;
      if (!restored) {
        restoreError = true;
        return false;
      }
      conflict = false;
      restoreError = false;
      return true;
    } catch {
      restoreError = true;
      return false;
    }
  }

  /** 丢弃或关闭后清理本实例的冲突/失败反馈，不触碰表单当前值。 */
  export function cancelDraftRestore(): void {
    conflict = false;
    restoreError = false;
  }

  function handleSaved(): void {
    // 保存成功后等待新的服务端基线；旧快照不得在下次干净回调中复活。
    baseline = undefined;
    conflict = false;
    restoreError = false;
    onSaved?.();
  }
</script>

<div
  class="workspace-tabs__editor"
  data-workspace-editor={resourceName}
  data-workspace-editor-record={recordId}
  data-workspace-editor-dirty={dirty ? 'true' : 'false'}
>
  {#if dirty}
    <p class="workspace-tabs__editor-status" role="status" data-workspace-editor-dirty-status>
      {i18n.t('common.unsaved')}
    </p>
  {/if}
  {#if conflict}
    <p class="workspace-tabs__editor-status" role="alert" data-workspace-draft-conflict>
      {isZh
        ? '保存的字段草稿与最新记录在声明字段上不一致，未恢复。请丢弃草稿或重新编辑后保存。'
        : 'The saved field draft no longer matches the latest record on the declared fields, so it was not restored. Discard it or edit and save again.'}
    </p>
  {/if}
  {#if restoreError}
    <p class="workspace-tabs__editor-status" role="alert" data-workspace-draft-restore-error>
      {isZh
        ? '草稿无法恢复，当前表单保持不变。请重试或丢弃草稿。'
        : 'The draft could not be restored and the form was left unchanged. Retry or discard the draft.'}
    </p>
  {/if}
  <AutoForm
    bind:this={autoForm}
    {resourceName}
    rendering={rendering}
    id={recordId}
    mode="edit"
    showHeader={false}
    redirect={false}
    onCancel={onCancel}
    {onNavigationGuardReady}
    onDirtyChange={setDirty}
    draftFields={effectiveDraftFields}
    onDraftChange={handleAutoDraft}
    onSuccess={handleSaved}
  />
</div>
