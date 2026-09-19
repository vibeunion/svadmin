<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { applySurfaceEditProposal } from '../edits.js';
  import type { SurfaceRevision } from '../edits.js';
  import { defaultSurfaceCatalog } from '../catalog.js';
  import type { SurfaceRenderCatalog } from '../catalog.js';
  import type { SurfaceDataProvider, SurfacePolicy } from '../types.js';
  import SurfaceRenderer from './SurfaceRenderer.svelte';
  import { editorClasses, editorButtonClasses } from '../styles/editor.generated.js';
  import '../styles/editor.css';

  export interface SurfaceEditPreviewProps {
    readonly revision: SurfaceRevision;
    readonly proposal?: unknown;
    readonly streaming?: boolean;
    readonly policy: SurfacePolicy;
    readonly catalog?: SurfaceRenderCatalog;
    readonly dataProvider?: SurfaceDataProvider;
    readonly scopeKey?: string;
    readonly locale?: string;
    readonly density?: 'compact' | 'comfortable';
    /** 用户确认后返回候选快照。宿主负责持久化 CAS 与服务端授权。 */
    readonly onApply?: (candidate: SurfaceRevision) => void | Promise<void>;
  }

  let {
    revision, proposal, streaming = false, policy, catalog = defaultSurfaceCatalog,
    dataProvider, scopeKey = '', locale, density = 'comfortable', onApply,
  }: SurfaceEditPreviewProps = $props();
  const i18n = useTranslation();
  const activeLocale = $derived(locale ?? i18n.locale);
  const labels = $derived(activeLocale.startsWith('zh') ? {
    title: '界面修改提案', current: '当前版本', preview: '预览修改', back: '返回当前',
    apply: '确认应用', loading: '正在接收提案；当前界面保持不变', empty: '尚无修改提案',
    invalid: '提案未通过校验，不能应用', ready: '提案已校验，尚未应用',
    previewing: '正在预览，尚未应用', applying: '正在应用', failed: '应用失败，请重新确认后重试',
    readonly: '当前宿主未配置应用操作',
  } : {
    title: 'Surface edit proposal', current: 'Current revision', preview: 'Preview changes', back: 'Back to current',
    apply: 'Apply changes', loading: 'Receiving proposal; current surface is unchanged', empty: 'No edit proposal',
    invalid: 'Proposal is invalid and cannot be applied', ready: 'Validated proposal; not applied',
    previewing: 'Preview only; not applied', applying: 'Applying changes', failed: 'Application failed; confirm again to retry',
    readonly: 'No apply handler is configured',
  });
  const candidate = $derived(streaming || proposal === undefined || proposal === null || proposal === ''
    ? null : applySurfaceEditProposal(revision, proposal, catalog, policy));
  const candidateKey = $derived(candidate?.ok ? JSON.stringify([scopeKey, candidate.value]) : '');
  let selectedPreview = $state('');
  let applying = $state(false);
  let applicationFailed = $state(false);
  const previewing = $derived(candidateKey !== '' && selectedPreview === candidateKey && !streaming);
  const visibleSpec = $derived(previewing && candidate?.ok ? candidate.value.spec : revision.spec);
  const status = $derived(streaming ? labels.loading : applying ? labels.applying : candidate === null
    ? labels.empty : !candidate.ok ? labels.invalid : previewing ? labels.previewing : labels.ready);

  async function apply(): Promise<void> {
    if (streaming || applying || !onApply) return;
    // 点击时使用最新 revision/policy 重新校验，不复用旧预览作为权限凭据。
    const latest = applySurfaceEditProposal(revision, proposal, catalog, policy);
    if (!latest.ok) return;
    applying = true;
    applicationFailed = false;
    try {
      await onApply(latest.value);
      selectedPreview = '';
    } catch {
      applicationFailed = true;
    } finally {
      applying = false;
    }
  }
</script>

<section class="svadmin-surface-editor {editorClasses[density]}" aria-label={labels.title} data-density={density}>
  <div data-part="toolbar">
    <div>
      <h3 data-part="title">{labels.title}</h3>
      <p data-part="status" role="status" aria-live="polite">{status} · {labels.current} {revision.revision}</p>
    </div>
    <div data-part="actions">
      <button
        type="button"
        class={editorButtonClasses.secondary}
        disabled={streaming || applying || !candidate?.ok}
        aria-pressed={previewing}
        onclick={() => { selectedPreview = previewing ? '' : candidateKey; }}
      >{previewing ? labels.back : labels.preview}</button>
      <button
        type="button"
        class={editorButtonClasses.primary}
        disabled={streaming || applying || !candidate?.ok || !onApply}
        title={onApply ? undefined : labels.readonly}
        onclick={apply}
      >{applying ? labels.applying : labels.apply}</button>
    </div>
  </div>
  {#if candidate && !candidate.ok}
    <div data-part="error" role="alert">
      {labels.invalid}
      <ul>{#each candidate.issues as issue, index (`${issue.code}:${issue.path}:${index}`)}
        <li><code>{issue.code}</code>: {issue.message}</li>
      {/each}</ul>
    </div>
  {/if}
  {#if applicationFailed}
    <div data-part="error" role="alert">{labels.failed}</div>
  {/if}
  <div data-part="viewport" data-preview={previewing}>
    <SurfaceRenderer spec={visibleSpec} {policy} {catalog} {dataProvider} {scopeKey} locale={activeLocale} />
  </div>
</section>
