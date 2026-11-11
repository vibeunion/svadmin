<script lang="ts">
  interface Props {
    secret?: string;
    payload?: string;
    algorithm?: string;
    signature?: string;
    class?: string;
  }

  let {
    secret = 'whsec_sample_secret',
    payload = '{"test":true}',
    algorithm = 'SHA-256',
    signature = '7b5a8e0f9c2d1b4a6e8f3c5d7a9b0e2f4a6c8e0d2b4f6a8c0e2d4f6a8c0e2d4f',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-hmac-calculator {className}"
  data-svadmin-component="LiteHmacSignatureCalculator"
  role="region"
  aria-label="HMAC Signature Calculator"
>
  <header class="lite-hmac-header">
    <span class="lite-hmac-title">HMAC 签名现场计算器 (SSR)</span>
    <span class="lite-hmac-algo">HMAC-{algorithm}</span>
  </header>

  <div class="lite-hmac-body">
    <div class="lite-hmac-row">
      <span class="lite-hmac-label">密钥:</span>
      <code class="lite-hmac-val">{secret}</code>
    </div>

    <div class="lite-hmac-row">
      <span class="lite-hmac-label">待签载荷:</span>
      <code class="lite-hmac-val">{payload}</code>
    </div>

    <div class="lite-hmac-result">
      <span class="lite-hmac-label">签名结果 (Hex):</span>
      <div class="lite-hmac-sig">{signature}</div>
    </div>
  </div>
</div>

<style>
  .lite-hmac-calculator {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-hmac-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-hmac-title { font-weight: 600; color: #1d2129; }
  .lite-hmac-algo { font-size: 10px; font-family: monospace; background: #e8f3ff; color: #165dff; padding: 1px 6px; border-radius: 3px; }
  .lite-hmac-body { padding: 12px; }
  .lite-hmac-row { display: flex; gap: 8px; margin-bottom: 8px; font-family: monospace; }
  .lite-hmac-label { color: #86909c; min-width: 60px; font-family: sans-serif; }
  .lite-hmac-val { color: #1d2129; word-break: break-all; }
  .lite-hmac-result { margin-top: 8px; }
  .lite-hmac-sig {
    margin-top: 4px;
    padding: 8px;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    font-family: monospace;
    font-weight: 700;
    color: #165dff;
    word-break: break-all;
    font-size: 11px;
  }
</style>
