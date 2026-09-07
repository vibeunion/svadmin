<script lang="ts">
 
  import { captureAdminContext, inferResource } from '@svadmin/core';
  import type { InferResult } from '@svadmin/core';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Badge } from './ui/badge/index.js';
  import * as Card from './ui/card/index.js';
  import * as Table from './ui/table/index.js';
  import * as Alert from './ui/alert/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import { ScrollArea } from './ui/scroll-area/index.js';
  import { Select } from './ui/select/index.js';
  import { Wand2, Copy, Check, RefreshCw, Loader2, AlertCircle } from '@lucide/svelte';

  const adminContext = captureAdminContext();
  const resources = $derived(adminContext.resources);

  let selectedResource = $state('');
  let inferResult = $state<InferResult | null>(null);
  let codeTarget = $state<'resource' | 'typebox' | 'list' | 'create' | 'edit' | 'show'>('resource');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let copied = $state(false);
  let customEndpoint = $state('');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let inferenceEpoch = 0;

  $effect(() => {
    return () => { if (copyTimer) clearTimeout(copyTimer); };
  });

  $effect(() => {
    void adminContext.providerBundle;
    void adminContext.tenantCacheKey?.__svadminTenant;
    void resources;
    inferenceEpoch += 1;
    inferResult = null;
    loading = false;
    error = null;

    return () => {
      inferenceEpoch += 1;
    };
  });

  async function runInference() {
    const resourceName = customEndpoint.trim() || selectedResource;
    if (!resourceName) return;

    const epoch = ++inferenceEpoch;
    loading = true;
    error = null;
    inferResult = null;

    try {
      const dataProvider = adminContext.getDataProviderForResource(resourceName);
      const response = await dataProvider.getList({
        resource: resourceName,
        pagination: { current: 1, pageSize: 25 },
      });
      if (epoch !== inferenceEpoch) return;

      if (!response.data || response.data.length === 0) {
        error = `No data returned from "${resourceName}". The API must return at least one record to infer fields.`;
        return;
      }

      inferResult = inferResource(
        resourceName,
        response.data as Record<string, unknown>[],
      );
    } catch (e: unknown) {
      if (epoch === inferenceEpoch) {
        error = e instanceof Error ? e.message : 'Failed to fetch data for inference.';
      }
    } finally {
      if (epoch === inferenceEpoch) loading = false;
    }
  }

  const activeCode = $derived.by(() => {
    if (!inferResult) return '';
    if (codeTarget === 'typebox') return inferResult.typeboxCode;
    if (codeTarget === 'list') return inferResult.componentCode.list;
    if (codeTarget === 'create') return inferResult.componentCode.create;
    if (codeTarget === 'edit') return inferResult.componentCode.edit;
    if (codeTarget === 'show') return inferResult.componentCode.show;
    return inferResult.code;
  });

  function copyCode() {
    if (!activeCode) return;
    navigator.clipboard.writeText(activeCode);
    copied = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copied = false; }, 2000);
  }

  const typeVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    text: 'secondary',
    number: 'default',
    boolean: 'outline',
    date: 'secondary',
    email: 'default',
    url: 'outline',
    image: 'secondary',
    images: 'secondary',
    textarea: 'outline',
    json: 'secondary',
    tags: 'default',
    select: 'outline',
    relation: 'destructive',
    color: 'secondary',
    phone: 'default',
  };
</script>

<Card.Root>
  <Card.CardHeader class="svadmin-u-7fcf9124b5df">
    <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
      <Wand2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      Resource Inferencer
    </Card.CardTitle>
  </Card.CardHeader>
  <Card.CardContent class="svadmin-u-3e7ce58d64fa">
    <!-- Resource selector -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4">
      <Select
        class="svadmin-u-36e579c0b41c"
        bind:value={selectedResource}
        placeholder="— Select a resource —"
      >
        {#each resources as res, _i (_i)}
          <option value={res.name}>{res.label} ({res.name})</option>
        {/each}
      </Select>
      <span class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-359090c2d529 svadmin-u-bfa603190748">or</span>
      <Input
        type="text"
        class="svadmin-u-df403bbae8fc"
        placeholder="custom endpoint"
        bind:value={customEndpoint}
      />
    </div>

    <Button size="sm" onclick={runInference} disabled={loading || (!selectedResource && !customEndpoint.trim())}>
      {#if loading}
        <Loader2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-afbdd13a380e" data-icon="inline-start" />
        Inferring...
      {:else}
        <RefreshCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" data-icon="inline-start" />
        Infer Fields
      {/if}
    </Button>

    {#if error}
      <Alert.Root variant="destructive">
        <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if loading}
      <div class="svadmin-u-6f7e013d6499">
        {#each Array(4) as _, _i (_i)}
          <Skeleton class="svadmin-u-ed8a5df7b2fb svadmin-u-6da6a3c3f741" />
        {/each}
      </div>
    {/if}

    {#if inferResult}
      <!-- Field table -->
      <ScrollArea class="svadmin-u-e5738cbd2714">
        <Table.Root>
          <Table.Header>
            <Table.Row class="svadmin-u-358af0b65a31">
              <Table.Head>Field</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head class="svadmin-u-ca6bf63030aa">List</Table.Head>
              <Table.Head class="svadmin-u-ca6bf63030aa">Form</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each inferResult.fields as field, _i (_i)}
              <Table.Row>
                <Table.Cell class="svadmin-u-0e65706bcccd svadmin-u-359090c2d529">{field.key}</Table.Cell>
                <Table.Cell>
                  <Badge variant={typeVariants[field.type] ?? 'secondary'}>
                    {field.type}
                    {#if field.resource}→ {field.resource}{/if}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="svadmin-u-ca6bf63030aa">{field.showInList ? '✓' : '—'}</Table.Cell>
                <Table.Cell class="svadmin-u-ca6bf63030aa">{field.showInForm ? '✓' : '—'}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </ScrollArea>

      <!-- Generated code -->
      <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-2cd02d11d1af">
        <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-44ee8ba0a421 svadmin-u-2ef11f1cb219 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-65fdbade2025">
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
            <Button
              variant={codeTarget === 'resource' ? 'secondary' : 'ghost'}
              size="sm"
              class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-d5eab218aa34"
              onclick={() => { codeTarget = 'resource'; }}
            >
              Resource (TS)
            </Button>
            <Button
              variant={codeTarget === 'typebox' ? 'secondary' : 'ghost'}
              size="sm"
              class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-d5eab218aa34"
              onclick={() => { codeTarget = 'typebox'; }}
            >
              TypeBox Schema
            </Button>
            <Button
              variant={codeTarget === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-d5eab218aa34"
              onclick={() => { codeTarget = 'list'; }}
            >
              List Page
            </Button>
            <Button
              variant={codeTarget === 'create' ? 'secondary' : 'ghost'}
              size="sm"
              class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-d5eab218aa34"
              onclick={() => { codeTarget = 'create'; }}
            >
              Create Form
            </Button>
            <Button
              variant={codeTarget === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-d5eab218aa34"
              onclick={() => { codeTarget = 'edit'; }}
            >
              Edit Form
            </Button>
            <Button
              variant={codeTarget === 'show' ? 'secondary' : 'ghost'}
              size="sm"
              class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-d5eab218aa34"
              onclick={() => { codeTarget = 'show'; }}
            >
              Show Page
            </Button>
          </div>
          <Button variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={copyCode}>
            {#if copied}
              <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-76747e5e02ff" />
              <span class="svadmin-u-76747e5e02ff">Copied!</span>
            {:else}
              <Copy class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
              Copy
            {/if}
          </Button>
        </div>
        <pre class="svadmin-u-8aee2b07b47d svadmin-u-73fc3fb18ceb svadmin-u-2859c861d7de svadmin-u-eb6e8b881acd svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-0e65706bcccd">{activeCode}</pre>
      </div>

      <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">
        Inferred {inferResult.fields.length} fields from sample data. Copy the code above into your Svelte 5 application files.
      </p>
    {/if}
  </Card.CardContent>
</Card.Root>
