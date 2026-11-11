<script lang="ts">
  import {
    KeyRound,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Check,
    Save,
    Upload,
  } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface EnvVariableItem {
    key: string;
    value: string;
    isSecret?: boolean | undefined;
    description?: string | undefined;
  }

  export interface EnvVariableEditorProps {
    environment?: string | undefined;
    initialVariables?: EnvVariableItem[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onSaveEnv?: ((variables: Record<string, string>, environment: string) => void) | undefined;
  }

  let {
    environment = 'production',
    initialVariables = [
      { key: 'DATABASE_URL', value: 'postgresql://postgres:secret@db.internal:5432/app', isSecret: true },
      { key: 'STRIPE_SECRET_KEY', value: 'mock_secret_key_demo_placeholder', isSecret: true },
      { key: 'NEXT_PUBLIC_APP_URL', value: 'https://svadmin.example.com', isSecret: false },
      { key: 'PORT', value: '3000', isSecret: false },
    ],
    title,
    description,
    class: className = '',
    onSaveEnv,
  }: EnvVariableEditorProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let activeEnv = $state(untrack(() => environment));
  let variables = $state<EnvVariableItem[]>(untrack(() => JSON.parse(JSON.stringify(initialVariables))));
  let revealedKeys = $state(new Set<string>());
  let showImportModal = $state(false);
  let importRawText = $state('');
  let isSaved = $state(false);

  function toggleReveal(key: string) {
    const next = new Set(revealedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    revealedKeys = next;
  }

  function addVariable() {
    variables = [
      ...variables,
      {
        key: `NEW_VAR_${variables.length + 1}`,
        value: '',
        isSecret: true,
      },
    ];
  }

  function removeVariable(idx: number) {
    variables = variables.filter((_, i) => i !== idx);
  }

  function handleParseEnvText() {
    const lines = importRawText.split('\n');
    const newVars: EnvVariableItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.slice(0, eqIdx).trim();
        let v = trimmed.slice(eqIdx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        newVars.push({
          key: k,
          value: v,
          isSecret: /SECRET|KEY|PASSWORD|TOKEN|URL|AUTH/i.test(k),
        });
      }
    }

    if (newVars.length > 0) {
      variables = newVars;
      showImportModal = false;
      importRawText = '';
    }
  }

  function handleSave() {
    const map: Record<string, string> = {};
    variables.forEach((v) => {
      map[v.key] = v.value;
    });
    onSaveEnv?.(map, activeEnv);
    isSaved = true;
    setTimeout(() => {
      isSaved = false;
    }, 2000);
  }

  const resolvedTitle = $derived(title ?? (chinese ? '多环境配置与敏感密钥管理器' : 'Environment & Secret Vault'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '多环境配置项隔离、敏感 API 密钥掩码显隐与 .env 批量导入导出' : 'Manage multi-environment secrets and env configs'),
  );
</script>

<div
  data-svadmin-component="EnvVariableEditor"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col text-xs',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <KeyRound class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>

    <!-- Env Switcher Tabs -->
    <div class="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
      {#each ['development', 'staging', 'production'] as env (env)}
        <button
          type="button"
          onclick={() => (activeEnv = env)}
          class={cn(
            'px-2.5 py-1 rounded-md font-mono capitalize transition-all',
            activeEnv === env ? 'bg-card text-foreground font-bold shadow-2xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {env}
        </button>
      {/each}
    </div>
  </div>

  <!-- Actions Toolbar -->
  <div class="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/60">
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={addVariable}>
        <Plus class="h-3.5 w-3.5" />
        <span>{chinese ? '新增变量' : 'Add Variable'}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1"
        onclick={() => (showImportModal = true)}
      >
        <Upload class="h-3.5 w-3.5" />
        <span>{chinese ? '导入 .env' : 'Import .env'}</span>
      </Button>
    </div>

    <Button size="sm" class="h-7 text-xs gap-1.5" onclick={handleSave}>
      {#if isSaved}
        <Check class="h-3.5 w-3.5 text-success" />
        <span>{chinese ? '已保存生效' : 'Saved'}</span>
      {:else}
        <Save class="h-3.5 w-3.5" />
        <span>{chinese ? `保存并应用 (${variables.length})` : 'Save Changes'}</span>
      {/if}
    </Button>
  </div>

  <!-- Variables List Table -->
  <div class="rounded-xl border border-border overflow-hidden">
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
        <tr>
          <th class="p-3 w-64">{chinese ? '配置键名 (Key)' : 'Key'}</th>
          <th class="p-3">{chinese ? '配置取值 (Value)' : 'Value'}</th>
          <th class="p-3 w-24 text-center">{chinese ? '保密掩码' : 'Secret'}</th>
          <th class="p-3 w-16 text-center">{chinese ? '操作' : 'Action'}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each variables as v, idx (idx)}
          {@const isMasked = v.isSecret && !revealedKeys.has(v.key)}
          <tr class="hover:bg-muted/20">
            <td class="p-2.5">
              <input
                type="text"
                bind:value={v.key}
                class="h-7.5 w-full rounded border border-input bg-background px-2 font-mono text-xs font-semibold text-foreground"
              />
            </td>
            <td class="p-2.5">
              <div class="relative flex items-center">
                <input
                  type={isMasked ? 'password' : 'text'}
                  bind:value={v.value}
                  class="h-7.5 w-full rounded border border-input bg-background px-2.5 font-mono text-xs text-foreground pr-8"
                />
                {#if v.isSecret}
                  <button
                    type="button"
                    onclick={() => toggleReveal(v.key)}
                    class="absolute right-2 text-muted-foreground hover:text-foreground"
                    aria-label={isMasked ? 'Reveal secret' : 'Hide secret'}
                  >
                    {#if isMasked}
                      <Eye class="h-3.5 w-3.5" />
                    {:else}
                      <EyeOff class="h-3.5 w-3.5" />
                    {/if}
                  </button>
                {/if}
              </div>
            </td>
            <td class="p-2.5 text-center">
              <input type="checkbox" bind:checked={v.isSecret} />
            </td>
            <td class="p-2.5 text-center">
              <button
                type="button"
                onclick={() => removeVariable(idx)}
                class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Remove variable"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Import Modal Dialog -->
{#if showImportModal}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Import .env"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
  >
    <div class="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-xs space-y-3">
      <div class="flex items-center justify-between border-b border-border/70 pb-3">
        <h4 class="text-sm font-bold text-foreground">{chinese ? '批量导入 .env 文本' : 'Import .env Content'}</h4>
        <button type="button" onclick={() => (showImportModal = false)} class="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <textarea
        bind:value={importRawText}
        placeholder="KEY1=val1\nKEY2=val2"
        rows="8"
        class="w-full rounded-lg border border-input bg-muted/20 p-2.5 font-mono text-xs focus-visible:outline-none"
      ></textarea>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onclick={() => (showImportModal = false)}>{chinese ? '取消' : 'Cancel'}</Button>
        <Button size="sm" onclick={handleParseEnvText}>{chinese ? '解析并追加' : 'Parse & Import'}</Button>
      </div>
    </div>
  </div>
{/if}
