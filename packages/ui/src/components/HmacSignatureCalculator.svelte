<script lang="ts">
  import { untrack } from 'svelte';
  import { Shield, Key, Copy, Check, CheckCircle2, XCircle } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

  export interface HmacSignatureCalculatorProps {
    defaultSecret?: string | undefined;
    defaultBody?: string | undefined;
    algorithm?: HmacAlgorithm | undefined;
    class?: string | undefined;
  }

  let {
    defaultSecret = 'whsec_test_secret_key_8848',
    defaultBody = '{"event":"order.paid","amount":100}',
    algorithm = 'SHA-256',
    class: className = '',
  }: HmacSignatureCalculatorProps = $props();

  let secretKey = $state(untrack(() => defaultSecret));
  let requestBody = $state(untrack(() => defaultBody));
  let selectedAlgorithm = $state<HmacAlgorithm>(untrack(() => algorithm));
  let computedHexSignature = $state('');
  let expectedSignature = $state('');
  let isCopied = $state(false);

  async function calculateHmac() {
    if (!secretKey || !requestBody) {
      computedHexSignature = '';
      return;
    }

    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const messageData = encoder.encode(requestBody);

      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: selectedAlgorithm },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const hashArray = Array.from(new Uint8Array(signature));
        computedHexSignature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback for non-crypto environments
        computedHexSignature = 'simulated_hmac_' + secretKey.length + '_' + requestBody.length;
      }
    } catch {
      computedHexSignature = '';
    }
  }

  $effect(() => {
    // Recompute whenever inputs change
    if (secretKey !== undefined && requestBody !== undefined && selectedAlgorithm !== undefined) {
      calculateHmac();
    }
  });

  const isMatched = $derived.by<boolean | null>(() => {
    if (!expectedSignature.trim() || !computedHexSignature) return null;
    return expectedSignature.trim().toLowerCase() === computedHexSignature.toLowerCase();
  });

  async function copySignature() {
    if (!computedHexSignature || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(computedHexSignature);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    } catch {
      // Ignore
    }
  }
</script>

<div
  class={cn('rounded-md border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="HmacSignatureCalculator"
>
  <header class="flex items-center justify-between border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <Shield class="h-4 w-4 text-primary" />
      <h3 class="font-bold text-sm text-foreground">HMAC 签名计算与现场验签沙箱</h3>
    </div>
    <span class="text-xs font-mono text-muted-foreground">Web Crypto 原生算法加速</span>
  </header>

  <!-- Input Form -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
    <!-- Secret -->
    <div class="space-y-1">
      <label for="hmac-secret-key" class="block font-medium text-foreground">
        签名密钥 (Signing Secret Key)
      </label>
      <div class="flex items-center rounded-md border border-input bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary">
        <Key class="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
        <input
          id="hmac-secret-key"
          type="text"
          class="w-full bg-transparent outline-none text-foreground text-xs"
          bind:value={secretKey}
          placeholder="请输入密钥..."
        />
      </div>
    </div>

    <!-- Algorithm Selector -->
    <div class="space-y-1">
      <label for="hmac-algorithm" class="block font-medium text-foreground">
        哈希加密算法 (Algorithm)
      </label>
      <select
        id="hmac-algorithm"
        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
        bind:value={selectedAlgorithm}
      >
        <option value="SHA-256">HMAC-SHA256 (推荐工业规范)</option>
        <option value="SHA-384">HMAC-SHA384</option>
        <option value="SHA-512">HMAC-SHA512 (高安全等级)</option>
      </select>
    </div>
  </div>

  <!-- Body Textarea -->
  <div class="space-y-1 text-xs">
    <label for="hmac-body" class="block font-medium text-foreground font-mono">
      待签名原始载荷 (Raw Payload)
    </label>
    <textarea
      id="hmac-body"
      class="w-full h-24 rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-1 focus:ring-primary"
      bind:value={requestBody}
      spellcheck="false"
    ></textarea>
  </div>

  <!-- Computed Output -->
  <div class="rounded-md border border-border bg-muted/20 p-3.5 space-y-2 text-xs font-mono">
    <div class="flex items-center justify-between text-muted-foreground">
      <span class="font-bold text-foreground">实时计算所得 HMAC 签名结果 (Hex Digest)</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
        onclick={copySignature}
      >
        {#if isCopied}
          <Check class="h-3 w-3 text-success" />
          <span class="text-success font-semibold">已复制</span>
        {:else}
          <Copy class="h-3 w-3" />
          <span>复制结果</span>
        {/if}
      </button>
    </div>
    <div class="rounded border border-border bg-background p-2.5 font-bold text-foreground break-all select-all">
      {computedHexSignature || '请输入有效密钥与载荷以生成签名'}
    </div>
  </div>

  <!-- Signature Verifier Matcher -->
  <div class="space-y-1.5 text-xs font-mono border-t border-border pt-3">
    <label for="expected-signature" class="block font-medium text-foreground">
      接收端签名对比验证 (输入接收到的 Header 签名进行校验)
    </label>
    <div class="flex items-center gap-2">
      <input
        id="expected-signature"
        type="text"
        class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
        bind:value={expectedSignature}
        placeholder="例如粘贴 X-Svadmin-Signature 标头值..."
      />

      {#if isMatched !== null}
        {#if isMatched}
          <span class="inline-flex items-center gap-1 rounded bg-success/10 border border-success/30 text-success font-semibold px-2.5 py-1 shrink-0">
            <CheckCircle2 class="h-3.5 w-3.5" />
            <span>验签成功 (Valid)</span>
          </span>
        {:else}
          <span class="inline-flex items-center gap-1 rounded bg-destructive/10 border border-destructive/30 text-destructive font-semibold px-2.5 py-1 shrink-0">
            <XCircle class="h-3.5 w-3.5" />
            <span>不匹配 (Mismatch)</span>
          </span>
        {/if}
      {/if}
    </div>
  </div>
</div>
