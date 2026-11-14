<script lang="ts" module>
  import { validateIpRuleValue as validatePattern } from './ip-access-rules.js';
  import type { IpAccessMode, IpAccessRule as AccessRule, IpRuleAction as RuleAction, IpRuleType as RuleType } from './ip-access-rules.js';
  export const validateIpRuleValue = validatePattern;
  export type IpAccessRule = AccessRule;
  export type IpRuleAction = RuleAction;
  export type IpRuleType = RuleType;

  export interface IpAccessRuleEditorProps {
    rules?: IpAccessRule[];
    mode?: IpAccessMode;
    currentClientIp?: string;
    resolveClientIp?: () => Promise<string>;
    busy?: boolean;
    class?: string;
    onChange?: (rules: IpAccessRule[]) => void | Promise<void>;
    onAddMyIp?: (ip: string) => void | Promise<void>;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Plus from '@lucide/svelte/icons/plus';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Sheet } from './ui/sheet/index.js';
  import { ipRuleState, lockoutError, ruleTimingError } from './ip-access-rules.js';

  let { rules = $bindable([]), mode = 'WHITELIST', currentClientIp = '', resolveClientIp,
    busy: pending = $bindable(false), class: className = '', onChange, onAddMyIp }: IpAccessRuleEditorProps = $props();
  const uid = $props.id();
  let searchQuery = $state('');
  let typeFilter = $state<'ALL' | IpRuleType>('ALL');
  let actionFilter = $state<'ALL' | IpRuleAction>('ALL');
  let modalOpen = $state(false);
  let editId = $state<string | null>(null);
  let editType = $state<IpRuleType>('SINGLE');
  let editValue = $state('');
  let editAction = $state<IpRuleAction>('ALLOW');
  let editDescription = $state('');
  let editExpiration = $state('PERMANENT');
  let originalExpiration = $state<string | null>(null);
  let editStartsAt = $state('');
  let errorMessage = $state('');
  let validationError = $state('');
  let now = $state(Date.now());
  let patternInput = $state<HTMLInputElement | null>(null);
  let detectedIp = $state('');
  let editSnapshot = $state('');
  const clientIp = $derived(currentClientIp.trim() || detectedIp);
  const currentIpValid = $derived(validateIpRuleValue('SINGLE', clientIp).valid);
  const filteredRules = $derived(rules.filter(rule =>
    (typeFilter === 'ALL' || rule.type === typeFilter) && (actionFilter === 'ALL' || rule.action === actionFilter)
    && `${rule.value} ${rule.description ?? ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase())));

  onMount(() => {
    const timer = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(timer);
  });

  function localDate(iso?: string | null): string {
    if (!iso || !Number.isFinite(Date.parse(iso))) return '';
    const date = new Date(iso);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 23);
  }

  function openRule(rule?: IpAccessRule) {
    editSnapshot = policySnapshot();
    editId = rule?.id ?? null;
    editType = rule?.type ?? 'SINGLE';
    editValue = rule?.value ?? '';
    editAction = rule?.action ?? (mode === 'WHITELIST' ? 'ALLOW' : 'DENY');
    editDescription = rule?.description ?? '';
    originalExpiration = rule?.expiresAt ?? null;
    editExpiration = rule ? 'KEEP' : 'PERMANENT';
    editStartsAt = localDate(rule?.startsAt);
    validationError = '';
    errorMessage = '';
    modalOpen = true;
  }

  function policySnapshot(): string {
    return JSON.stringify({ rules, mode, clientIp });
  }

  async function commitRules(nextRules: IpAccessRule[]): Promise<boolean> {
    if (pending) return false;
    errorMessage = lockoutError(nextRules, mode, clientIp, Date.now()) ?? '';
    if (errorMessage) return false;
    pending = true;
    const previousSnapshot = policySnapshot();
    const submittedSnapshot = JSON.stringify({ rules: nextRules, mode, clientIp });
    try {
      await onChange?.(nextRules.map(rule => ({ ...rule })));
      if (![previousSnapshot, submittedSnapshot].includes(policySnapshot())) {
        errorMessage = 'Policy changed while saving. Reload the latest policy before continuing.';
        return false;
      }
      rules = nextRules;
      return true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to save rules. Try again.';
      return false;
    } finally { pending = false; }
  }

  async function detectClientIp() {
    if (!resolveClientIp || pending) return;
    pending = true;
    errorMessage = '';
    try {
      const resolved = (await resolveClientIp()).trim();
      if (!validateIpRuleValue('SINGLE', resolved).valid) throw new Error('The server returned an invalid client IP.');
      detectedIp = resolved;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to detect client IP. Try again.';
    } finally { pending = false; }
  }

  onMount(() => { if (!currentClientIp && resolveClientIp) void detectClientIp(); });

  async function trustCurrentIp() {
    if (!currentIpValid || pending) return;
    const existing = rules.find(rule => rule.type === 'SINGLE' && rule.value.trim() === clientIp && rule.action === 'ALLOW');
    const trusted: IpAccessRule = { ...existing, id: existing?.id ?? crypto.randomUUID(), type: 'SINGLE',
      value: clientIp, action: 'ALLOW', enabled: true, startsAt: null, expiresAt: null,
      description: existing?.description ?? 'Current administrator IP' };
    if (await commitRules([trusted, ...rules.filter(rule => rule.id !== trusted.id)])) {
      try { await onAddMyIp?.(clientIp); }
      catch (error) { errorMessage = error instanceof Error ? error.message : 'The IP was saved, but the notification callback failed.'; }
    }
  }

  function expiration(): string | null {
    if (editExpiration === 'KEEP') return originalExpiration;
    const hours = { '2H': 2, '24H': 24, '7D': 168 }[editExpiration as '2H' | '24H' | '7D'];
    const activation = editStartsAt ? Date.parse(editStartsAt) : Date.now();
    return hours ? new Date(Math.max(Date.now(), activation) + hours * 3_600_000).toISOString() : null;
  }

  async function saveRule(event: SubmitEvent) {
    event.preventDefault();
    if (editSnapshot !== policySnapshot()) {
      errorMessage = 'Policy changed while editing. Close and reopen the editor before saving.';
      return;
    }
    validationError = validateIpRuleValue(editType, editValue).error ?? '';
    if (editStartsAt && !Number.isFinite(Date.parse(editStartsAt))) validationError = 'Invalid activation date.';
    if (validationError) { patternInput?.focus(); return; }
    const existing = rules.find(rule => rule.id === editId);
    const startsAt = editStartsAt === localDate(existing?.startsAt)
      ? existing?.startsAt ?? null : editStartsAt ? new Date(editStartsAt).toISOString() : null;
    const next: IpAccessRule = { ...existing, id: editId ?? crypto.randomUUID(), type: editType,
      value: editValue.trim(), action: editAction, description: editDescription.trim(),
      enabled: existing?.enabled ?? true, startsAt,
      expiresAt: expiration() };
    validationError = ruleTimingError(next) ?? '';
    if (validationError) return;
    const updated = editId ? rules.map(rule => rule.id === editId ? next : { ...rule }) : [next, ...rules];
    if (await commitRules(updated)) modalOpen = false;
  }

  function toggleRule(rule: IpAccessRule) {
    void commitRules(rules.map(current => ({ ...current, enabled: current.id === rule.id ? !current.enabled : current.enabled })));
  }

  function countdown(rule: IpAccessRule): string {
    const state = ipRuleState(rule, now);
    const deadline = state === 'Scheduled' ? rule.startsAt : rule.expiresAt;
    if (state === 'Expired' || state === 'Invalid' || state === 'Disabled') return state;
    if (!deadline) return 'Permanent';
    const seconds = Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
    return `${state === 'Scheduled' ? 'Starts in' : 'Expires in'} ${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s`;
  }
</script>

<section class="ip-editor {className}" data-svadmin-component="IpAccessRuleEditor" aria-labelledby={`${uid}-title`} aria-busy={pending}>
  <header class="ip-header">
    <h2 id={`${uid}-title`}><ShieldCheck size={20} aria-hidden="true" /> IP Access Control Rules</h2>
    <span class="ip-mode">{mode === 'WHITELIST' ? 'Whitelist Mode' : 'Blacklist Mode'}</span>
    <Button size="sm" onclick={() => openRule()} disabled={pending}><Plus size={16} aria-hidden="true" />Add IP Rule</Button>
  </header>
  <div class="ip-client">
    <span><MapPin size={16} aria-hidden="true" />Current IP: <strong>{clientIp || 'Unavailable'}</strong></span>
    {#if resolveClientIp}<Button variant="outline" size="sm" disabled={pending} onclick={detectClientIp}>Detect IP</Button>{/if}
    <Button variant="outline" size="sm" disabled={pending || !currentIpValid} onclick={trustCurrentIp}>Trust My IP</Button>
  </div>
  {#if errorMessage && !modalOpen}<p role="alert" class="ip-error">{errorMessage}</p>{/if}
  <div class="ip-filters">
    <Input aria-label="Search IP rules" placeholder="Filter by IP, CIDR or description..." bind:value={searchQuery} />
    <select aria-label="Rule type filter" bind:value={typeFilter} class="svadmin-select">
      <option value="ALL">All Types</option><option value="SINGLE">Single IP</option><option value="CIDR">CIDR Subnet</option><option value="RANGE">IP Range</option>
    </select>
    <select aria-label="Rule action filter" bind:value={actionFilter} class="svadmin-select">
      <option value="ALL">All Actions</option><option value="ALLOW">ALLOW</option><option value="DENY">DENY</option>
    </select>
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (键盘用户需要滚动宽表格。) -->
  <div class="ip-table-scroll" tabindex="0" role="region" aria-label="IP access rules">
    <table>
      <thead><tr><th scope="col">Status</th><th scope="col">IP / CIDR Pattern</th><th scope="col">Type</th><th scope="col">Action</th><th scope="col">Validity</th><th scope="col">Description</th><th scope="col">Operations</th></tr></thead>
      <tbody>
        {#each filteredRules as rule (rule.id)}
          <tr>
            <td><button type="button" role="switch" class="svadmin-switch" data-state={rule.enabled ? 'checked' : 'unchecked'}
              aria-checked={rule.enabled} disabled={pending} aria-label={`Toggle ${rule.value}`} onclick={() => toggleRule(rule)}>
              <span class="svadmin-switch-thumb"></span></button><span class="ip-state">{ipRuleState(rule, now)}</span></td>
            <td class="ip-pattern">{rule.value}</td><td>{rule.type}</td>
            <td><Badge variant={rule.action === 'ALLOW' ? 'subtle-success' : 'subtle-destructive'}>{rule.action}</Badge></td>
            <td class="ip-validity"><span>{countdown(rule)}</span>{#if rule.expiresAt}<time datetime={rule.expiresAt}>{new Date(rule.expiresAt).toLocaleString()}</time>{/if}</td>
            <td class="ip-description">{rule.description || '-'}</td>
            <td><div class="ip-actions">
              <Button variant="text" size="icon-sm" aria-label={`Edit ${rule.value}`} title="Edit rule" disabled={pending} onclick={() => openRule(rule)}><Pencil size={16} aria-hidden="true" /></Button>
              <Button variant="text" size="icon-sm" aria-label={`Delete ${rule.value}`} title="Delete rule" disabled={pending} onclick={() => { void commitRules(rules.filter(current => current.id !== rule.id)); }}><Trash2 size={16} aria-hidden="true" /></Button>
            </div></td>
          </tr>
        {:else}<tr><td colspan="7" class="ip-empty">No IP access rules found.</td></tr>{/each}
      </tbody>
    </table>
  </div>
</section>

<Sheet bind:open={modalOpen} class="svadmin-ip-rule-modal" role="dialog" aria-modal="true"
  closeOnOverlayClick={false}
  aria-labelledby={`${uid}-modal-title`} aria-describedby={`${uid}-modal-description`}
  closeLabel="Close rule editor" onCloseRequest={close => { if (!pending) close(); }}>
  <form onsubmit={saveRule}>
    <header class="ip-modal-header"><h3 id={`${uid}-modal-title`}>{editId ? 'Edit IP Access Rule' : 'Add IP Access Rule'}</h3>
      <p id={`${uid}-modal-description`}>IPv4 / IPv6</p></header>
    <fieldset disabled={pending}>
      <label for={`${uid}-type`}>Rule Type</label>
      <select id={`${uid}-type`} bind:value={editType} class="svadmin-select"><option value="SINGLE">Single IP</option><option value="CIDR">CIDR Subnet</option><option value="RANGE">IP Range</option></select>
      <label for={`${uid}-pattern`}>IP / Pattern Value</label>
      <Input id={`${uid}-pattern`} bind:ref={patternInput} bind:value={editValue} aria-invalid={!!validationError} aria-describedby={validationError ? `${uid}-validation` : undefined} />
      {#if validationError}<p id={`${uid}-validation`} class="ip-error" role="alert">{validationError}</p>{/if}
      <label for={`${uid}-action`}>Action</label>
      <select id={`${uid}-action`} bind:value={editAction} class="svadmin-select"><option value="ALLOW">ALLOW</option><option value="DENY">DENY</option></select>
      <label for={`${uid}-activation`}>Activation Time</label>
      <Input id={`${uid}-activation`} type="datetime-local" step="0.001" bind:value={editStartsAt} />
      <label for={`${uid}-expiration`}>Expiration Period</label>
      <select id={`${uid}-expiration`} bind:value={editExpiration} class="svadmin-select">
        {#if editId}<option value="KEEP">Keep existing expiration</option>{/if}
        <option value="PERMANENT">Permanent</option><option value="2H">2 Hours</option><option value="24H">24 Hours</option><option value="7D">7 Days</option>
      </select>
      <label for={`${uid}-description`}>Description</label><Input id={`${uid}-description`} bind:value={editDescription} />
    </fieldset>
    {#if errorMessage}<p role="alert" class="ip-error ip-save-error">{errorMessage}</p>{/if}
    <footer><Button variant="outline" disabled={pending} onclick={() => { modalOpen = false; }}>Cancel</Button>
      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Rule'}</Button></footer>
  </form>
</Sheet>

<style>
  .ip-editor { min-width: 0; color: var(--foreground); background: var(--card); font-size: var(--svadmin-text-body); }
  .ip-header, .ip-client, .ip-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .ip-header { padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: var(--svadmin-text-section); font-weight: 500; }
  .ip-mode { margin-right: auto; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .ip-client { padding: 16px 0; }
  .ip-client > span { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-right: auto; min-width: 0; }
  strong { font-weight: 500; overflow-wrap: anywhere; }
  .ip-filters { display: grid; grid-template-columns: minmax(160px, 1fr) repeat(2, minmax(120px, 160px)); gap: 12px; margin-bottom: 16px; }
  .ip-table-scroll { max-width: 100%; overflow-x: auto; }
  .ip-table-scroll:focus-visible { outline: var(--svadmin-focus-width) solid var(--ring); outline-offset: var(--svadmin-focus-offset); }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: var(--svadmin-text-label); }
  th { font-weight: 500; background: var(--muted); white-space: nowrap; }
  th, td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:hover td { background: var(--accent); }
  .ip-pattern { font-family: monospace; letter-spacing: 0; overflow-wrap: anywhere; min-width: 140px; }
  .ip-state, .ip-validity time { display: block; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); margin-top: 4px; }
  .ip-validity { min-width: 170px; font-variant-numeric: tabular-nums; }
  .ip-description { min-width: 120px; max-width: 240px; overflow-wrap: anywhere; }
  .ip-actions { gap: 4px; flex-wrap: nowrap; }
  .ip-error { color: var(--destructive); font-size: var(--svadmin-text-label); line-height: 1.5; overflow-wrap: anywhere; }
  .ip-empty { padding: 40px 16px; color: var(--muted-foreground); text-align: center; }
  :global(.svadmin-ip-rule-modal.svadmin-sheet-panel) { inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: min(520px, calc(100vw - 32px)); max-width: calc(100vw - 32px); height: auto; max-height: calc(100dvh - 32px); padding: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow-y: auto; }
  .ip-modal-header { padding: 20px 48px 16px 24px; border-bottom: 1px solid var(--border); }
  h3 { margin: 0; font-size: var(--svadmin-text-section); font-weight: 500; }
  .ip-modal-header p { margin: 8px 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  fieldset { display: grid; gap: 8px; margin: 0; padding: 20px 24px; border: 0; min-width: 0; }
  label { margin-top: 4px; font-size: var(--svadmin-text-label); }
  footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border); }
  .ip-save-error { margin: 0; padding: 0 24px 16px; }
  @media (max-width: 600px) { .ip-filters { grid-template-columns: 1fr; } .ip-header { align-items: flex-start; } th, td { padding: 12px; } }
</style>
