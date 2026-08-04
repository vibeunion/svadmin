<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  import { AlertCircle, Calendar, Check, Copy, Key, Plus, ShieldCheck, Trash2, Webhook } from '@lucide/svelte';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';

  const i18n = useTranslation();

  interface ApiKey {
    id: string;
    name: string;
    maskedToken: string;
    created: string;
    permissions: string[];
  }

  let keys = $state<ApiKey[]>([
    { id: 'prod-sync', name: 'Production Sync Service', maskedToken: 'sv_demo_prod_••••_4d3e', created: '2026-03-10', permissions: ['Read', 'Write'] },
    { id: 'reporting', name: 'Internal Reporting Tool', maskedToken: 'sv_demo_report_••••_9e8f', created: '2026-05-18', permissions: ['Read'] },
  ]);

  let newKeyName = $state('');
  let newKeyPermissions = $state({ Read: true, Write: false, Delete: false, Admin: false });
  let generatedToken = $state('');
  let showCreatedToken = $state(false);
  let copiedKeyId = $state<string | null>(null);

  interface WebhookEntry {
    id: string;
    name: string;
    url: string;
    eventType: string;
  }

  let webhooks = $state<WebhookEntry[]>([
    { id: 'wh-1', name: 'Order Events', url: 'https://api.acme.com/hooks/orders', eventType: 'resource.updated' },
  ]);
  let newWebhookName = $state('');
  let newWebhookUrl = $state('');
  let newWebhookEvent = $state('resource.created');

  function handleAddWebhook(event: SubmitEvent) {
    event.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    webhooks = [
      ...webhooks,
      { id: Date.now().toString(), name: newWebhookName.trim(), url: newWebhookUrl.trim(), eventType: newWebhookEvent },
    ];
    newWebhookName = '';
    newWebhookUrl = '';
  }

  function deleteWebhook(id: string) {
    webhooks = webhooks.filter(w => w.id !== id);
  }

  function generateDemoToken() {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `sv_demo_${randomHex}`;
  }

  function handleGenerateKey(event: SubmitEvent) {
    event.preventDefault();
    if (!newKeyName.trim()) return;

    const token = generateDemoToken();
    const permissions = Object.entries(newKeyPermissions)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    keys = [
      ...keys,
      {
        id: Date.now().toString(),
        name: newKeyName.trim(),
        maskedToken: `${token.slice(0, 14)}••••${token.slice(-4)}`,
        created: new Date().toISOString().split('T')[0],
        permissions,
      },
    ];
    generatedToken = token;
    showCreatedToken = true;
    newKeyName = '';
    newKeyPermissions = { Read: true, Write: false, Delete: false, Admin: false };
  }

  function deleteKey(id: string) {
    keys = keys.filter((key) => key.id !== id);
  }

  async function copyToken(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(token);
      copiedKeyId = id;
      setTimeout(() => {
        if (copiedKeyId === id) copiedKeyId = null;
      }, 2000);
    } catch {
      copiedKeyId = null;
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.api')}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{i18n.t('settings.apiDescription')}</p>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    <Card.Card class="lg:col-span-1">
      <Card.CardHeader>
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Plus class="h-4 w-4" />
          {i18n.t('api.generateTitle')}
        </Card.CardTitle>
        <Card.CardDescription>{i18n.t('api.generateDesc')}</Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent>
        <form onsubmit={handleGenerateKey} class="space-y-4">
          <div class="space-y-2">
            <Label for="api-key-name">{i18n.t('api.keyName')}</Label>
            <Input id="api-key-name" placeholder="CI deployment token" bind:value={newKeyName} required />
          </div>

          <div class="space-y-3">
            <Label>{i18n.t('api.permissions')}</Label>
            {#each Object.keys(newKeyPermissions) as permission (permission)}
              <div class="flex items-center gap-2">
                <Checkbox id={`perm-${permission}`} bind:checked={newKeyPermissions[permission as keyof typeof newKeyPermissions]} />
                <Label for={`perm-${permission}`} class="cursor-pointer text-sm font-normal">{permission}</Label>
              </div>
            {/each}
          </div>

          <Button type="submit" class="w-full">{i18n.t('api.generateButton')}</Button>
        </form>
      </Card.CardContent>
    </Card.Card>

    <Card.Card class="lg:col-span-2">
      <Card.CardHeader>
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Key class="h-4 w-4 text-muted-foreground" />
          {i18n.t('api.activeKeysTitle')}
        </Card.CardTitle>
        <Card.CardDescription>{i18n.t('api.activeKeysDesc')}</Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent>
        {#if showCreatedToken}
          <div class="mb-6 space-y-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <div class="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
              <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h4 class="font-semibold">{i18n.t('api.successTitle')}</h4>
                <p class="mt-0.5 text-xs">{i18n.t('api.successHint')}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Input readonly value={generatedToken} class="h-9 font-mono text-xs" />
              <Button size="sm" onclick={() => copyToken(generatedToken, 'new-token')}>
                {#if copiedKeyId === 'new-token'}
                  <Check class="h-4 w-4" />
                {:else}
                  <Copy class="h-4 w-4" />
                {/if}
              </Button>
            </div>
            <div class="flex justify-end">
              <Button variant="ghost" size="sm" onclick={() => { showCreatedToken = false; generatedToken = ''; }}>{i18n.t('common.close')}</Button>
            </div>
          </div>
        {/if}

        <div class="divide-y">
          {#each keys as key (key.id)}
            <div class="space-y-3 py-4 first:pt-0 last:pb-0">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 space-y-1">
                  <h4 class="text-sm font-semibold text-foreground">{key.name}</h4>
                  <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span class="font-mono">{key.maskedToken}</span>
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      {key.created}
                    </span>
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onclick={() => copyToken(key.maskedToken, key.id)} title={i18n.t('common.copy')}>
                    {#if copiedKeyId === key.id}
                      <Check class="h-4 w-4 text-green-500" />
                    {:else}
                      <Copy class="h-4 w-4" />
                    {/if}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onclick={() => deleteKey(key.id)} title={i18n.t('common.delete')}>
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div class="flex flex-wrap gap-1">
                {#each key.permissions as permission (permission)}
                  <Badge variant="secondary" class="px-2 py-0 text-[10px]">{permission}</Badge>
                {/each}
              </div>
            </div>
          {:else}
            <div class="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <AlertCircle class="h-8 w-8 opacity-60" />
              <span>{i18n.t('api.noKeys')}</span>
            </div>
          {/each}
        </div>
      </Card.CardContent>
    </Card.Card>

    <!-- Webhooks -->
    <Card.Card>
      <Card.CardHeader>
        <Card.CardTitle class="flex items-center gap-2">
          <Webhook class="h-4 w-4 text-muted-foreground" />
          {i18n.t('api.webhooks')}
        </Card.CardTitle>
        <Card.CardDescription>{i18n.t('api.webhooksDesc')}</Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent class="space-y-4">
        <form class="grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto]" onsubmit={handleAddWebhook}>
          <div class="space-y-1.5">
            <Label for="webhook-name">{i18n.t('api.webhookName')}</Label>
            <Input id="webhook-name" bind:value={newWebhookName} placeholder="Order Events" />
          </div>
          <div class="space-y-1.5">
            <Label for="webhook-url">{i18n.t('api.webhookUrl')}</Label>
            <Input id="webhook-url" type="url" bind:value={newWebhookUrl} placeholder="https://api.example.com/hooks" />
          </div>
          <div class="space-y-1.5">
            <Label for="webhook-event">{i18n.t('api.eventType')}</Label>
            <select id="webhook-event" bind:value={newWebhookEvent} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="resource.created">resource.created</option>
              <option value="resource.updated">resource.updated</option>
              <option value="resource.deleted">resource.deleted</option>
              <option value="auth.login">auth.login</option>
            </select>
          </div>
          <div class="flex items-end">
            <Button type="submit" size="sm" disabled={!newWebhookName.trim() || !newWebhookUrl.trim()}>
              <Plus class="h-3.5 w-3.5 mr-1" />{i18n.t('api.addWebhook')}
            </Button>
          </div>
        </form>

        <div class="divide-y border-t">
          {#each webhooks as hook (hook.id)}
            <div class="flex items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{hook.name}</p>
                <p class="truncate font-mono text-xs text-muted-foreground">{hook.url}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" class="px-2 py-0 text-[10px]">{hook.eventType}</Badge>
                <Button variant="ghost" size="icon-sm" onclick={() => deleteWebhook(hook.id)} title={i18n.t('common.delete')}>
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          {:else}
            <p class="py-4 text-center text-sm text-muted-foreground">{i18n.t('api.noWebhooks')}</p>
          {/each}
        </div>
      </Card.CardContent>
    </Card.Card>
  </div>
</div>
