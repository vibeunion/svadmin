<script lang="ts">
  import PermissionMatrix from '../../../packages/ui/src/components/PermissionMatrix.svelte';

  const roles = [
    { code: 'reader', name: 'Reader' },
    { code: 'editor', name: 'Editor' },
  ];
  const resources = [{ code: 'orders', name: 'Orders' }];
  const actions = [
    { code: 'read', name: 'Read' },
    { code: 'update', name: 'Update' },
  ];
  let instances = $state([{ role: 'reader' }, { role: 'reader' }]);
  let grants = $state<Record<string, Record<string, string[]>>>({
    '0:reader': { orders: ['read'] },
    '0:editor': { orders: [] },
    '1:reader': { orders: [] },
    '1:editor': { orders: [] },
  });
  let toggles = $state(0);
  let submissions = $state(0);
  let lastToggle = $state('');

  function granted(instance: number, role: string, action: string): boolean {
    return grants[`${instance}:${role}`]?.orders?.includes(action) ?? false;
  }

  function toggle(instance: number, role: string, resource: string, action: string, grant: boolean): void {
    const key = `${instance}:${role}`;
    const current = grants[key]?.[resource] ?? [];
    grants = {
      ...grants,
      [key]: { ...grants[key], [resource]: grant ? [...current, action] : current.filter(value => value !== action) },
    };
    toggles += 1;
    lastToggle = JSON.stringify({ instance, role, resource, action, grant });
  }
</script>

<div data-testid="permission-matrix-fixture">
  <h1>Permission matrix fixture</h1>
  <form onsubmit={(event) => { event.preventDefault(); submissions += 1; }}>
    {#each instances as state, instance (instance)}
      <section data-testid={`permission-matrix-${instance + 1}`}>
        <PermissionMatrix
          roles={roles}
          {resources}
          {actions}
          bind:selectedRole={state.role}
          isGranted={(role, _resource, action) => granted(instance, role, action)}
          onToggle={(role, resource, action, grant) => toggle(instance, role, resource, action, grant)}
        />
      </section>
    {/each}
    <button type="submit">Submit host form</button>
  </form>
  <output hidden data-testid="permission-toggles">{toggles}</output>
  <output hidden data-testid="permission-submissions">{submissions}</output>
  <output hidden data-testid="permission-last-toggle">{lastToggle}</output>
</div>
