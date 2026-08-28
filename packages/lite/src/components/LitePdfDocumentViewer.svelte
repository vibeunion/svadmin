<script lang="ts">
  export interface DocumentStamp {
    id: string;
    text: string;
    page: number;
    status?: string;
  }

  interface Props {
    fileUrl?: string;
    fileName?: string;
    totalPages?: number;
    currentPage?: number;
    stamps?: DocumentStamp[];
    class?: string;
  }

  let {
    fileUrl = '',
    fileName = 'Document.pdf',
    totalPages = 1,
    currentPage = 1,
    stamps = [],
    class: className = '',
  }: Props = $props();
</script>

<div class="sv-lite-pdf-viewer {className}">
  <div class="sv-lite-pdf-header">
    <strong>{fileName}</strong>
    <span class="sv-lite-pdf-page">Page {currentPage} of {totalPages}</span>
    {#if fileUrl}
      <a href={fileUrl} download={fileName} class="sv-lite-pdf-dl">Download PDF</a>
    {/if}
  </div>

  {#if fileUrl}
    <div class="sv-lite-pdf-embed-wrapper">
      <object data={fileUrl} type="application/pdf" title={fileName} class="sv-lite-pdf-object">
        <p class="sv-lite-pdf-fallback">
          Your browser does not support inline PDF viewing.
          <a href={fileUrl} target="_blank" rel="noreferrer">Click here to open the PDF directly.</a>
        </p>
      </object>
    </div>
  {:else}
    <div class="sv-lite-pdf-placeholder">
      <div class="sv-lite-pdf-sheet">
        <h3>{fileName}</h3>
        <p>Document preview placeholder (SSR Lite mode). Provide a valid PDF URL to stream directly.</p>
        {#if stamps.length > 0}
          <div class="sv-lite-stamps">
            <strong>Approved Stamps:</strong>
            {#each stamps as s (s.id)}
              <span class="sv-lite-stamp-badge">{s.text} (P.{s.page})</span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .sv-lite-pdf-viewer {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
  }
  .sv-lite-pdf-header {
    margin-bottom: 10px;
    font-size: 13px;
    color: #0f172a;
    padding-bottom: 8px;
    border-bottom: 1px solid #cbd5e1;
  }
  .sv-lite-pdf-page {
    color: #64748b;
    font-size: 11px;
    margin-left: 8px;
  }
  .sv-lite-pdf-dl {
    float: right;
    color: #4338ca;
    text-decoration: none;
    font-weight: 600;
  }
  .sv-lite-pdf-embed-wrapper {
    width: 100%;
    height: 600px;
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
  }
  .sv-lite-pdf-object {
    width: 100%;
    height: 100%;
  }
  .sv-lite-pdf-fallback {
    padding: 20px;
    text-align: center;
    color: #64748b;
  }
  .sv-lite-pdf-placeholder {
    padding: 20px;
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    text-align: center;
  }
  .sv-lite-pdf-sheet {
    display: inline-block;
    width: 400px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    padding: 20px;
    text-align: left;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .sv-lite-stamps {
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
  }
  .sv-lite-stamp-badge {
    display: inline-block;
    padding: 2px 6px;
    background-color: #dcfce7;
    color: #166534;
    border-radius: 3px;
    font-size: 10px;
    margin-left: 6px;
    font-weight: bold;
  }
</style>
