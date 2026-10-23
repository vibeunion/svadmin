<script lang="ts">
  import ModalForm from '../../../packages/ui/src/components/ModalForm.svelte';
  import DrawerForm from '../../../packages/ui/src/components/DrawerForm.svelte';

  type Kind = 'modal' | 'drawer';
  type Outcome = 'resolve' | 'reject-sync' | 'reject-async' | 'defer';
  type Pending = { id: number; draft: string; resolve: () => void; reject: (error: Error) => void };

  let { kind = 'modal' }: { kind?: Kind } = $props();

  let open = $state(false);
  let draft = $state('Quarterly renewal draft');
  let outcome = $state<Outcome>('resolve');
  let externalSubmitting = $state(false);
  let submitCount = $state(0);
  let cancelCount = $state(0);
  let submittedDrafts = $state<string[]>([]);
  let pending = $state<Pending[]>([]);
  let nextDeferredId = 0;

  const pendingIds = $derived(pending.map(item => `#${item.id}`).join(' | ') || 'none');
  const draftLog = $derived(submittedDrafts.join(' | ') || 'none');

  // 宿主只持有 open / isSubmitting / onsubmit 结果与 deferred 句柄，不读写组件内部状态。
  function trackDeferred(draftValue: string): Promise<void> {
    let settle!: () => void;
    let fail!: (error: Error) => void;
    const promise = new Promise<void>((resolve, reject) => {
      settle = resolve;
      fail = reject;
    });
    pending = [...pending, { id: ++nextDeferredId, draft: draftValue, resolve: settle, reject: fail }];
    return promise;
  }

  function settleDeferred(which: 'oldest' | 'newest', action: 'resolve' | 'reject'): void {
    const entry = which === 'oldest' ? pending[0] : pending.at(-1);
    if (!entry) return;
    pending = pending.filter(item => item.id !== entry.id);
    if (action === 'resolve') entry.resolve();
    else entry.reject(new Error(`PRIVATE_DEFERRED_REJECTION_${entry.id}`));
  }

  // 同步分支必须真正在调用栈内 throw；异步分支返回一个拒绝的 Promise；defer 返回宿主句柄。
  function handleSubmit(): void | Promise<void> {
    submitCount += 1;
    const attempt = submitCount;
    submittedDrafts = [...submittedDrafts, draft];
    if (outcome === 'reject-sync') throw new Error(`PRIVATE_SYNC_SUBMIT_REJECTION_${attempt}`);
    if (outcome === 'reject-async') {
      return Promise.resolve().then(() => {
        throw new Error(`PRIVATE_ASYNC_SUBMIT_REJECTION_${attempt}`);
      });
    }
    if (outcome === 'defer') return trackDeferred(draft);
    return Promise.resolve();
  }

  function handleCancel(): void {
    cancelCount += 1;
  }
</script>

<div class="fixture" data-testid="modal-drawer-form-fixture" data-kind={kind}>
  <header>
    <p class="eyebrow">MODALFORM / DRAWERFORM · BROWSER FIXTURE</p>
    <h1>Host-controlled {kind} form</h1>
    <p>宿主控制面只改 open、isSubmitting 和 deferred 结局，不触碰组件私有状态。</p>
  </header>

  <section aria-label="Host control plane" class="control-plane">
    <div class="row">
      <button type="button" data-testid="open-form" onclick={() => { open = true; }}>Open form</button>
      <button type="button" data-testid="force-close" onclick={() => { open = false; }}>Force close</button>
      <button
        type="button"
        data-testid="toggle-external-submitting"
        aria-pressed={externalSubmitting}
        onclick={() => { externalSubmitting = !externalSubmitting; }}
      >
        External isSubmitting: {externalSubmitting ? 'on' : 'off'}
      </button>
    </div>
    <div class="row">
      <button type="button" data-testid="outcome-resolve" aria-pressed={outcome === 'resolve'} onclick={() => { outcome = 'resolve'; }}>
        Next submit resolves
      </button>
      <button type="button" data-testid="outcome-reject-sync" aria-pressed={outcome === 'reject-sync'} onclick={() => { outcome = 'reject-sync'; }}>
        Next submit rejects sync
      </button>
      <button type="button" data-testid="outcome-reject-async" aria-pressed={outcome === 'reject-async'} onclick={() => { outcome = 'reject-async'; }}>
        Next submit rejects async
      </button>
      <button type="button" data-testid="outcome-defer" aria-pressed={outcome === 'defer'} onclick={() => { outcome = 'defer'; }}>
        Next submit defers
      </button>
    </div>
    <div class="row">
      <button type="button" data-testid="resolve-oldest" onclick={() => settleDeferred('oldest', 'resolve')}>Resolve oldest pending</button>
      <button type="button" data-testid="reject-oldest" onclick={() => settleDeferred('oldest', 'reject')}>Reject oldest pending</button>
      <button type="button" data-testid="resolve-newest" onclick={() => settleDeferred('newest', 'resolve')}>Resolve newest pending</button>
      <button type="button" data-testid="reject-newest" onclick={() => settleDeferred('newest', 'reject')}>Reject newest pending</button>
    </div>
  </section>

  <dl class="evidence">
    <div><dt>kind</dt><dd data-testid="fixture-kind">{kind}</dd></div>
    <div><dt>outcome</dt><dd data-testid="host-outcome">{outcome}</dd></div>
    <div><dt>open</dt><dd data-testid="host-open">{open ? 'open' : 'closed'}</dd></div>
    <div><dt>submits</dt><dd data-testid="host-submits">{submitCount}</dd></div>
    <div><dt>cancels</dt><dd data-testid="host-cancels">{cancelCount}</dd></div>
    <div><dt>pending</dt><dd data-testid="host-pending">{pending.length}</dd></div>
    <div><dt>pending ids</dt><dd data-testid="host-pending-ids">{pendingIds}</dd></div>
    <div><dt>drafts</dt><dd data-testid="host-drafts">{draftLog}</dd></div>
  </dl>

  <section aria-label="Form host">
    {#if kind === 'modal'}
      <ModalForm
        bind:open
        title="Renewal form"
        description="Host-controlled modal form"
        triggerText=""
        submitText="Save"
        cancelText="Cancel"
        isSubmitting={externalSubmitting}
        onsubmit={handleSubmit}
        oncancel={handleCancel}
      >
        <label for="modal-drawer-draft-input">Draft</label>
        <input id="modal-drawer-draft-input" data-testid="draft-input" bind:value={draft} />
      </ModalForm>
    {:else}
      <DrawerForm
        bind:open
        side="right"
        title="Renewal form"
        description="Host-controlled drawer form"
        triggerText=""
        submitText="Save"
        cancelText="Cancel"
        isSubmitting={externalSubmitting}
        onsubmit={handleSubmit}
        oncancel={handleCancel}
      >
        <label for="modal-drawer-draft-input">Draft</label>
        <input id="modal-drawer-draft-input" data-testid="draft-input" bind:value={draft} />
      </DrawerForm>
    {/if}
  </section>
</div>

<style>
  .fixture { display: grid; gap: 20px; padding: 24px; min-width: 0; }
  header h1 { margin: 4px 0 8px; font-size: 24px; line-height: 1.25; }
  header p { margin: 0; max-width: 68ch; color: var(--muted-foreground); font-size: 14px; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0; }
  .control-plane, .evidence { border: 1px solid var(--border); border-radius: 8px; background: var(--card); padding: 12px; min-width: 0; }
  .control-plane { display: grid; gap: 8px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .control-plane button { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; background: var(--background); color: var(--foreground); font-size: 12px; }
  .control-plane button[aria-pressed="true"] { border-color: var(--ring); font-weight: 600; }
  .control-plane button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .evidence { display: grid; gap: 6px; margin: 0; font-size: 12px; }
  .evidence > div { display: flex; gap: 8px; min-width: 0; }
  .evidence dt { flex: 0 0 88px; color: var(--muted-foreground); }
  .evidence dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
</style>