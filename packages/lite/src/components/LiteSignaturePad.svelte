<script lang="ts">
  interface Props {
    name?: string;
    value?: string;
    label?: string;
    formAction?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    name = 'signature',
    value = '',
    label = 'Electronic Signature',
    formAction = '',
    disabled = false,
    class: className = '',
  }: Props = $props();
</script>

<div class="sv-lite-signature-card {className}">
  <div class="sv-lite-sig-header">
    <strong>{label}</strong>
    <span class="sv-lite-sig-sub">(Upload or review signed receipt)</span>
  </div>

  {#if value}
    <div class="sv-lite-sig-preview">
      <img src={value} alt="Signature Preview" class="sv-lite-sig-img" />
    </div>
  {:else}
    <div class="sv-lite-sig-empty">
      No signature registered
    </div>
  {/if}

  <div class="sv-lite-sig-actions">
    <form method="POST" action={formAction} enctype="multipart/form-data">
      <input type="file" name={name} accept="image/*" {disabled} class="sv-lite-sig-file" />
      <button type="submit" {disabled} class="sv-lite-sig-btn">Upload Signature</button>
    </form>
  </div>
</div>

<style>
  .sv-lite-signature-card {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
  }
  .sv-lite-sig-header {
    margin-bottom: 8px;
    font-size: 13px;
    color: #0f172a;
  }
  .sv-lite-sig-sub {
    color: #64748b;
    font-size: 11px;
    margin-left: 6px;
  }
  .sv-lite-sig-preview {
    border: 2px dashed #cbd5e1;
    border-radius: 4px;
    padding: 10px;
    text-align: center;
    background-color: #f8fafc;
    margin-bottom: 10px;
  }
  .sv-lite-sig-img {
    max-height: 80px;
    max-width: 100%;
    vertical-align: middle;
  }
  .sv-lite-sig-empty {
    border: 2px dashed #cbd5e1;
    border-radius: 4px;
    padding: 24px;
    text-align: center;
    color: #94a3b8;
    background-color: #f8fafc;
    margin-bottom: 10px;
  }
  .sv-lite-sig-file {
    font-size: 11px;
    margin-right: 8px;
  }
  .sv-lite-sig-btn {
    padding: 4px 10px;
    font-size: 11px;
    background-color: #4f46e5;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
</style>
