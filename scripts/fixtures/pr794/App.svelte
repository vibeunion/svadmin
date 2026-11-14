<script lang="ts">
  import FeatureFlagStudio from '../../../packages/ui/src/components/FeatureFlagStudio.svelte';
  import { createFeatureFlagRegistry, useFeatureFlag, type FeatureFlag } from '../../../packages/ui/src/components/useFeatureFlag.svelte.js';

  const flags: FeatureFlag[] = [
    { key: 'billing_v2', name: 'Billing Engine V2', description: 'Gradual release for the unified invoice calculator.', enabled: true, percentage: 25, tags: ['billing', 'beta'] },
    { key: 'ai_copilot', name: 'AI Table Copilot', description: 'Whitelist-only pilot for workspace administrators.', enabled: true, percentage: 0, rules: [{ field: 'role', operator: 'in', values: ['admin'] }], tags: ['ai', 'pilot'] },
    { key: 'export_csv', name: 'Async CSV Export', description: 'Export streaming is disabled pending service readiness.', enabled: false, percentage: 0, tags: ['export'] },
  ];
  const registry = createFeatureFlagRegistry(flags);
  const billing = useFeatureFlag('billing_v2', () => ({ userId: 'user_123' }), false, registry);
</script>

<main class="min-h-screen bg-background p-8 text-foreground">
  <div class="mx-auto max-w-6xl">
    <p class="mb-4 text-sm text-muted-foreground">Workspace: Product release controls · Preview user: user_123</p>
    <FeatureFlagStudio {flags} {registry} />
    <p class="mt-4 text-sm" data-testid="billing-consumer">Connected billing consumer: {billing.enabled ? 'enabled' : 'disabled'}</p>
  </div>
</main>
