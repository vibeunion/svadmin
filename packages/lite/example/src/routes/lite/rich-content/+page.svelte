<script lang="ts">
  import {
    LiteCommentThread,
    LiteInsightCard,
    LiteMarkdownField,
    LiteNotificationCenter,
  } from '@svadmin/lite';
  import type { FieldDefinition } from '@svadmin/core';
  import { highlightCode } from '#lib/highlight';
  import { richContentOptions } from '#lib/rich-content-sample';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const markdownField = { key: 'notes', label: 'Release notes', type: 'markdown' } as FieldDefinition;
  const renderOptions = { ...richContentOptions, highlight: highlightCode };
</script>

<svelte:head>
  <title>Rich content rendering — @svadmin/lite</title>
</svelte:head>

<div class="lite-page">
  <div class="lite-page-header">
    <div>
      <h1 class="lite-page-title">富文本与 Markdown 服务端渲染</h1>
      <p class="lite-muted">
        所有内容在服务端渲染：Markdown 子集、白名单 HTML、表格、任务列表、脚注，以及宿主注入的代码高亮钩子。页面不发送任何脚本。
      </p>
    </div>
  </div>

  <section class="lite-card" style="padding: 16px; margin-bottom: 16px;">
    <h2 class="lite-page-title" style="font-size: 16px; margin: 0 0 8px;">MarkdownField（show 模式）</h2>
    <LiteMarkdownField field={markdownField} value={data.notes} mode="show" {renderOptions} />
  </section>

  <section class="lite-card" style="padding: 16px; margin-bottom: 16px;">
    <h2 class="lite-page-title" style="font-size: 16px; margin: 0 0 8px;">MarkdownField（edit 模式，含预览）</h2>
    <LiteMarkdownField field={markdownField} value={data.notes} mode="edit" {renderOptions} />
  </section>

  <LiteInsightCard title="Renewal insight" content={data.insight} {renderOptions} />

  <section class="lite-grid-tight" style="margin-bottom: 16px;">
    <LiteCommentThread
      label="Discussion (rich)"
      comments={data.comments}
      action="?/comment"
      richContent
      richContentOptions={renderOptions}
    />
  </section>

  <LiteNotificationCenter
    title="Notifications (rich)"
    items={data.notifications}
    markAllHref="?/read-all"
    richContent
  />
</div>

<style>
  /* Token colours come from the opt-in `lite-code-theme.css` variables, so one
     override re-themes every rich content surface on this page. */
  .lite-code-block {
    --lite-token-keyword: #7FD1FF;
    --lite-token-string: #9BE39B;
    --lite-token-number: #FFC17A;
    --lite-token-comment: #A9AEB8;
    margin: 0 0 8px;
    padding: 10px;
    border-radius: 4px;
    background: #1D2129;
    color: #E5E6EB;
    overflow-x: auto;
  }
  .lite-grid-tight > * + * { margin-top: 12px; }
</style>