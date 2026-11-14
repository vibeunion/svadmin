<script lang="ts" module>
  import type { IpAccessRuleEditorProps } from './IpAccessRuleEditor.svelte';
  import type { IpAccessMode } from './ip-access-rules.js';
  export interface IpWhitelistDrawerProps extends Omit<IpAccessRuleEditorProps, 'busy'> {
    open?: boolean;
    onClose?: () => void;
    onModeChange?: (mode: IpAccessMode) => void | Promise<void>;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { Sheet } from './ui/sheet/index.js';
  import IpAccessRuleEditor from './IpAccessRuleEditor.svelte';
  import { ipRuleState, lockoutError, validateIpRuleValue } from './ip-access-rules.js';

  let { open = $bindable(false), rules = $bindable([]), mode = $bindable('WHITELIST'),
    currentClientIp = '', resolveClientIp, class: className = '', onClose, onChange, onAddMyIp,
    onModeChange }: IpWhitelistDrawerProps = $props();
  const uid = $props.id();
  let modeError = $state('');
  let pending = $state(false);
  let editorBusy = $state(false);
  let detectedIp = $state('');
  let now = $state(Date.now());
  const clientIp = $derived(currentClientIp.trim() || detectedIp);
  const activeCount = $derived(rules.filter(rule => ipRuleState(rule, now) === 'Active').length);
  onMount(() => {
    const timer = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(timer);
  });

  async function resolveIp() {
    if (!resolveClientIp) throw new Error('No client IP resolver is configured.');
    const resolved = (await resolveClientIp()).trim();
    if (!validateIpRuleValue('SINGLE', resolved).valid) throw new Error('The server returned an invalid client IP.');
    detectedIp = resolved;
    return resolved;
  }

  async function changeMode(event: Event) {
    const control = event.currentTarget as HTMLSelectElement;
    const next = control.value as IpAccessMode;
    control.value = mode;
    if (pending || editorBusy || next === mode) return;
    modeError = lockoutError(rules, next, clientIp, Date.now()) ?? '';
    if (modeError) return;
    pending = true;
    const previousSnapshot = JSON.stringify({ rules, mode, clientIp });
    const submittedSnapshot = JSON.stringify({ rules, mode: next, clientIp });
    try {
      await onModeChange?.(next);
      if (![previousSnapshot, submittedSnapshot].includes(JSON.stringify({ rules, mode, clientIp }))) {
        modeError = 'Policy changed while switching mode. Reload the latest policy before continuing.';
        return;
      }
      mode = next;
    }
    catch (error) { modeError = error instanceof Error ? error.message : 'Unable to change enforcement mode. Try again.'; }
    finally { pending = false; }
  }
</script>

<Sheet bind:open {...(onClose ? { onClose } : {})} closeLabel="Close IP whitelist drawer" class="svadmin-ip-drawer {className}"
  onCloseRequest={close => { if (!pending && !editorBusy) close(); }}>
  <div data-svadmin-component="IpWhitelistDrawer" role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
  <header><h2 id={`${uid}-title`}>Network Security &amp; IP Access Rules</h2></header>
  <div class="ip-mode-bar">
    <label for={`${uid}-mode`}>Enforcement Mode</label>
    <select id={`${uid}-mode`} class="svadmin-select" value={mode} onchange={changeMode} disabled={pending || editorBusy}>
      <option value="WHITELIST">Whitelist Only</option><option value="BLACKLIST">Blacklist Block</option>
    </select>
    <span>Active rules: {activeCount} / {rules.length}</span>
  </div>
  {#if modeError}<p class="ip-mode-error" role="alert">{modeError}</p>{/if}
  <div class="ip-drawer-body" inert={pending}>
    <IpAccessRuleEditor bind:rules bind:busy={editorBusy} {mode} currentClientIp={clientIp}
      {...(resolveClientIp ? { resolveClientIp: resolveIp } : {})}
      {...(onChange ? { onChange } : {})} {...(onAddMyIp ? { onAddMyIp } : {})} />
  </div>
  </div>
</Sheet>

<style>
  :global(.svadmin-ip-drawer.svadmin-sheet-panel) { display: flex; flex-direction: column; width: min(1040px, 100vw); max-width: 100vw; padding: 0; }
  header { padding: 20px 48px 20px 24px; border-bottom: 1px solid var(--border); }
  h2 { margin: 0; color: var(--foreground); font-size: var(--svadmin-text-section); font-weight: 500; }
  .ip-mode-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--border); font-size: var(--svadmin-text-label); }
  .ip-mode-bar select { width: auto; max-width: 100%; }
  .ip-mode-bar span { margin-left: auto; color: var(--muted-foreground); }
  .ip-drawer-body { min-height: 0; overflow-y: auto; padding: 24px; }
  .ip-mode-error { margin: 0; padding: 16px 24px; color: var(--destructive); font-size: var(--svadmin-text-label); }
  @media (max-width: 600px) { .ip-drawer-body { padding: 16px; } .ip-mode-bar { padding: 16px; } }
</style>
