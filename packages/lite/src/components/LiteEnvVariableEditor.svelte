<script lang="ts">
  interface EnvItem {
    key: string;
    value: string;
    isSecret?: boolean;
    scope?: string;
  }

  interface Props {
    title?: string;
    environment?: string;
    variables?: EnvItem[];
    class?: string;
  }

  let {
    title = '环境变量与配置字典',
    environment = 'production',
    variables = [
      { key: 'DATABASE_URL', value: 'postgresql://postgres:******@db.cluster:5432/main', isSecret: true, scope: 'server' },
      { key: 'REDIS_HOST', value: 'redis-master.internal', isSecret: false, scope: 'all' },
      { key: 'STORAGE_BUCKET_NAME', value: 'corp-assets-prod', isSecret: false, scope: 'server' },
      { key: 'OIDC_CLIENT_SECRET', value: 'sec_live_9941a8******', isSecret: true, scope: 'auth' }
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-env-editor {className}"
  data-svadmin-component="LiteEnvVariableEditor"
  role="region"
  aria-label="Environment Variable Editor"
>
  <header class="lite-env-header">
    <div>
      <h4 class="lite-env-title">{title}</h4>
      <span class="lite-env-env-tag">环境: {environment}</span>
    </div>
    <span class="lite-env-count">{variables.length} 项环境变量</span>
  </header>

  <div class="lite-env-list">
    {#each variables as v (v.key)}
      <div class="lite-env-item">
        <div class="lite-env-key-wrap">
          <code class="lite-env-key">{v.key}</code>
          {#if v.isSecret}
            <span class="lite-env-badge-secret">加密机密</span>
          {/if}
          {#if v.scope}
            <span class="lite-env-badge-scope">{v.scope}</span>
          {/if}
        </div>
        <div class="lite-env-val-wrap">
          <code class="lite-env-value">{v.isSecret ? '●●●●●●●●●●●●' : v.value}</code>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-env-editor {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-env-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-env-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-env-env-tag { font-size: 11px; color: #165dff; font-weight: 600; display: block; margin-top: 2px; }
  .lite-env-count { font-size: 11px; color: #86909c; }
  .lite-env-list { padding: 8px 14px; }
  .lite-env-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f2f3f5;
  }
  .lite-env-item:last-child { border-bottom: none; }
  .lite-env-key-wrap { display: flex; align-items: center; gap: 6px; }
  .lite-env-key { font-weight: 600; color: #1d2129; font-family: monospace; font-size: 11px; }
  .lite-env-badge-secret {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    background: #ffece8;
    color: #f53f3f;
    font-weight: 500;
  }
  .lite-env-badge-scope {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    background: #f2f3f5;
    color: #4e5969;
  }
  .lite-env-value {
    color: #4e5969;
    font-family: monospace;
    font-size: 11px;
  }
</style>
