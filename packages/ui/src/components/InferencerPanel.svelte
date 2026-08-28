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

  function copyCode() {
    if (!inferResult) return;
    navigator.clipboard.writeText(inferResult.code);
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
  <Card.CardHeader class="pb-3">
    <Card.CardTitle class="flex items-center gap-2 text-base">
      <Wand2 class="h-4 w-4" />
      Resource Inferencer
    </Card.CardTitle>
  </Card.CardHeader>
  <Card.CardContent class="space-y-4">
    <!-- Resource selector -->
    <div class="flex gap-2">
      <Select
        class="flex-1"
        bind:value={selectedResource}
        placeholder="— Select a resource —"
      >
        {#each resources as res, _i (_i)}
          <option value={res.name}>{res.label} ({res.name})</option>
        {/each}
      </Select>
      <span class="flex items-center text-xs text-muted-foreground">or</span>
      <Input
        type="text"
        class="w-36"
        placeholder="custom endpoint"
        bind:value={customEndpoint}
      />
    </div>

    <Button size="sm" onclick={runInference} disabled={loading || (!selectedResource && !customEndpoint.trim())}>
      {#if loading}
        <Loader2 class="h-3 w-3 animate-spin" data-icon="inline-start" />
        Inferring...
      {:else}
        <RefreshCw class="h-3 w-3" data-icon="inline-start" />
        Infer Fields
      {/if}
    </Button>

    {#if error}
      <Alert.Root variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if loading}
      <div class="space-y-2">
        {#each Array(4) as _, _i (_i)}
          <Skeleton class="h-8 w-full" />
        {/each}
      </div>
    {/if}

    {#if inferResult}
      <!-- Field table -->
      <ScrollArea class="max-h-80">
        <Table.Root>
          <Table.Header>
            <Table.Row class="bg-muted/50">
              <Table.Head>Field</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head class="text-center">List</Table.Head>
              <Table.Head class="text-center">Form</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each inferResult.fields as field, _i (_i)}
              <Table.Row>
                <Table.Cell class="font-mono text-xs">{field.key}</Table.Cell>
                <Table.Cell>
                  <Badge variant={typeVariants[field.type] ?? 'secondary'}>
                    {field.type}
                    {#if field.resource}→ {field.resource}{/if}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-center">{field.showInList ? '✓' : '—'}</Table.Cell>
                <Table.Cell class="text-center">{field.showInForm ? '✓' : '—'}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </ScrollArea>

      <!-- Generated code -->
      <div class="rounded-lg border overflow-hidden">
        <div class="flex items-center justify-between bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span>Generated ResourceDefinition</span>
          <Button variant="ghost" size="sm" class="h-6 text-xs gap-1" onclick={copyCode}>
            {#if copied}
              <Check class="h-3 w-3 text-success" />
              <span class="text-success">Copied!</span>
            {:else}
              <Copy class="h-3 w-3" />
              Copy
            {/if}
          </Button>
        </div>
        <pre class="max-h-64 overflow-auto bg-muted/30 p-3 text-xs text-foreground font-mono">{inferResult.code}</pre>
      </div>

      <p class="text-xs text-muted-foreground">
        Inferred {inferResult.fields.length} fields from sample data. Copy the code above into your <code class="bg-muted px-1 rounded text-foreground">resources.ts</code> file.
      </p>
    {/if}
  </Card.CardContent>
</Card.Root>
