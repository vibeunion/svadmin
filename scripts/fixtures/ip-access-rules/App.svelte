<script lang="ts">
  import { onMount } from 'svelte';
  import IpAccessRuleEditor, { type IpAccessRule } from '../../../packages/ui/src/components/IpAccessRuleEditor.svelte';
  import IpWhitelistDrawer from '../../../packages/ui/src/components/IpWhitelistDrawer.svelte';
  import { Button } from '../../../packages/ui/src/components/ui/button/index.js';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  const currentClientIp = '203.0.113.195';
  let open = $state(false);
  let dark = $state(false);
  let mode = $state<'WHITELIST' | 'BLACKLIST'>('BLACKLIST');
  let rules = $state<IpAccessRule[]>([
    { id: 'operator', type: 'SINGLE', value: currentClientIp, action: 'ALLOW', enabled: true, description: 'Administrator connection' },
    { id: 'vpn', type: 'CIDR', value: '10.0.0.0/8', action: 'ALLOW', enabled: true, description: 'Corporate VPN' },
    { id: 'blocked', type: 'RANGE', value: '198.51.100.10 - 198.51.100.25', action: 'DENY', enabled: true, description: 'Restricted network' },
    { id: 'maintenance', type: 'CIDR', value: '192.0.2.0/24', action: 'ALLOW', enabled: true,
      expiresAt: new Date(Date.now() + 7_200_000).toISOString(), description: 'Maintenance window' },
  ]);
  let receipt = $state('');
  $effect(() => {
    document.body.classList.add('svadmin-theme');
    document.body.classList.toggle('dark', dark);
  });
  let deferSave = false;
  let finishSave: (() => void) | null = null;
  async function recordChanges(next: IpAccessRule[]) {
    receipt = JSON.stringify(next);
    await waitForWrite();
  }
  async function waitForWrite() {
    if (deferSave) {
      deferSave = false;
      await new Promise<void>(resolve => { finishSave = resolve; });
    }
  }
  onMount(() => {
    Object.assign(window, { __ipFixture: {
      snapshot: () => rules.map(rule => ({ ...rule })),
      replaceRules: (next: IpAccessRule[]) => { rules = next; },
      deferSave: () => { deferSave = true; },
      finishSave: () => { finishSave?.(); finishSave = null; },
    } });
    return () => { Reflect.deleteProperty(window, '__ipFixture'); };
  });
</script>

<main>
  <header><div><ShieldCheck size={24} aria-hidden="true" /><h1>Network access</h1></div>
    <nav aria-label="Network actions"><label><input type="checkbox" bind:checked={dark} />Dark mode</label>
      <Button variant="outline" onclick={() => { open = true; }}>Open whitelist drawer</Button></nav></header>
  <IpAccessRuleEditor bind:rules {mode} {currentClientIp} onChange={recordChanges} />
  <output data-testid="receipt" class="svadmin-sr-only">{receipt}</output>
</main>
<IpWhitelistDrawer bind:open bind:rules bind:mode {currentClientIp} onChange={recordChanges} onModeChange={waitForWrite} />

<style>
  :global(body) { margin: 0; background: var(--background); color: var(--foreground); font-family: Arial, sans-serif; }
  main { max-width: 1440px; margin: 0 auto; padding: 24px; }
  header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  header > div, nav, label { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: var(--svadmin-text-title); font-weight: 500; }
  label { font-size: var(--svadmin-text-label); }
  @media (max-width: 600px) { main { padding: 16px; } }
</style>
