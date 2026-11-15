<script lang="ts">
  interface Props {
    spEntityId: string;
    spAcsUrl: string;
    onCopy: (value: string, label: string) => void;
  }

  let { spEntityId, spAcsUrl, onCopy }: Props = $props();
</script>

<div class="p-4 rounded-lg bg-muted/40 border border-border flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold text-foreground uppercase tracking-wider">系统服务提供商 (SP) 对接参数</span>
    <span class="text-[11px] text-muted-foreground">请将此配置填入您的 Okta / Azure AD / Keycloak 中</span>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
    <div class="flex flex-col gap-1 p-2.5 rounded bg-card border border-border">
      <span class="text-muted-foreground font-medium">SP Entity ID (Audience URI):</span>
      <div class="flex items-center justify-between font-mono text-[11px] text-foreground break-all">
        <span>{spEntityId}</span>
        <button
          type="button"
          onclick={() => onCopy(spEntityId, 'SP Entity ID')}
          class="ml-2 px-1.5 py-0.5 text-[10px] font-sans rounded bg-muted hover:bg-muted/80 text-muted-foreground"
        >
          复制
        </button>
      </div>
    </div>
    <div class="flex flex-col gap-1 p-2.5 rounded bg-card border border-border">
      <span class="text-muted-foreground font-medium">ACS URL (Single Sign-On Callback):</span>
      <div class="flex items-center justify-between font-mono text-[11px] text-foreground break-all">
        <span>{spAcsUrl}</span>
        <button
          type="button"
          onclick={() => onCopy(spAcsUrl, 'ACS URL')}
          class="ml-2 px-1.5 py-0.5 text-[10px] font-sans rounded bg-muted hover:bg-muted/80 text-muted-foreground"
        >
          复制
        </button>
      </div>
    </div>
  </div>
</div>
