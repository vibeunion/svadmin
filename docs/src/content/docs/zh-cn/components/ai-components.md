---
title: AI 界面组件
description: 基于 ChatProvider 的对话、建议、命令和洞察组件
---

`@svadmin/ai-elements` 提供 `ChatDialog`、`SmartSuggest`、`AICommandBar`、`CopilotPanel`、
`InsightCard` 和 `VoiceInput`。它们共享 Core 的
`ChatProvider`，但不会替代权限、数据域和审计边界。

## 安装

```bash
bun add @svadmin/ai-elements @svadmin/core @sinclair/typebox @tanstack/svelte-query svelte
```

## 配置 ChatProvider

将 `ChatProvider` 传给所属的 `AdminApp`，不要依赖模块级全局 setter：

```svelte
<script lang="ts">
import { AdminApp } from '@svadmin/ui';
import { ChatDialog } from '@svadmin/ai-elements';

const chatProvider = {
  async *sendMessage(messages, options) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      signal: options?.signal,
    });
    if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text) yield text;
      }
      const tail = decoder.decode();
      if (tail) yield tail;
    } finally {
      reader.releaseLock();
    }
  },
};
</script>

<AdminApp {dataProvider} {resources} {chatProvider}>
  {#snippet aiAssistant({ docked, scope, ownerScope })}
    <ChatDialog
      {docked}
      {scope}
      {ownerScope}
      persistKey={`user:${currentUser.id}:assistant`}
    />
  {/snippet}
</AdminApp>
```

`ChatDialog` 默认只在内存中保存历史。传入非空 `persistKey` 才会启用
`localStorage`；键中必须包含稳定且非敏感的用户标识，防止共用浏览器的账号互相恢复历史。
宿主需要服务端历史时，应使用 `onPersist` 和 `onRestore`。恢复失败后，当前历史作用域
会停止后续写入，避免空回退覆盖远端历史；宿主可通过 `onPersistenceError` 报告错误或
提示用户。

组件样式请在应用入口引入：

```css
@import '@svadmin/ai-elements/ai.css';
```

Vite SSR 应将这个包使用的 Svelte 和 ESM 依赖边界加入 `ssr.noExternal`：

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    noExternal: [
      '@tanstack/svelte-query',
      '@xyflow/svelte',
      '@xyflow/system',
      'katex',
      'streamdown-svelte',
    ],
  },
});
```

## 组件

- 核心消息：`Conversation`、`Message`、`Response`、`PromptInput`、`Reasoning`、`Tool`、`Sources`、`InlineCitation`。
- 对话与工作流：`ChainOfThought`、`Checkpoint`、`Confirmation`、`Plan`、`Question`、`Queue`、`Shimmer`、`Suggestion`、`Task`。
- 上下文与生成结果：`Attachments`、`ModelSelector`、`Context`、`Artifact`、`Image`、`OpenIn`、`WebPreview`。
- 开发者输出：`Agent`、`CodeBlock`、`Commit`、`EnvironmentVariables`、`FileTree`、`JSXPreview`、`PackageInfo`、`Sandbox`、`SchemaDisplay`、`Snippet`、`StackTrace`、`Terminal`、`TestResults`。
- 语音：`AudioPlayer`、`MicSelector`、`Persona`、`SpeechInput`、`Transcription`、`VoiceSelector`。
- 工作流画布：`Canvas`、`Connection`、`Controls`、`Edge`、`Node`、`Panel`、`Toolbar`。
- 工具扩展：`CopyButton`、`Loader`、`ContextIcon`、`TokensWithCost`、`ToolStatusBadge`、`PromptInputSpeechButton`。
- `ChatDialog`：浮动对话窗口，支持流式 Markdown、上下文和动作。
- `SmartSuggest`：在字段内提供低打扰建议。
- `AICommandBar`：为命令面板增加自然语言查询。
- `CopilotPanel`：当前页面的上下文助手。
- `InsightCard`：把有边界的数据摘要为可读洞察。
- `VoiceInput`：通过浏览器语音识别输入文本。

消息内容使用可扩展的 `parts` 模型，支持文本、reasoning、工具调用、来源、附件和审批等结构化内容。

生成式组件必须通过 TypeBox schema 注册。模型提供的 props 会先经过运行时解码。
根对象 schema 默认采用严格模式，即使没有重复设置 `additionalProperties: false`，
未声明字段也会被拒绝：

```svelte
<script lang="ts">
  import { Type } from '@sinclair/typebox';
  import { ChatDialog, defineGeneratedComponent } from '@svadmin/ai-elements';
  import InventorySummary from './InventorySummary.svelte';

  const componentRegistry = {
    InventorySummary: defineGeneratedComponent({
      component: InventorySummary,
      schema: Type.Object({
        warehouse: Type.String(),
        count: Type.Integer({ minimum: 0 }),
      }),
    }),
  };
</script>

<ChatDialog {componentRegistry} />
```

导出的 `AI_ELEMENT_PARITY` 清单会分别记录固定上游提交的包导出面、行为验证和
视觉验证状态。导出名称为 exact 并不自动代表交互或像素级 1:1。`JSXPreview`
使用受限且经过 TypeBox 校验的解析器；`Tool.getStatusBadge` 返回供 Svelte 渲染的
状态元数据，而不是 React 元素。这两项均标记为有意的行为差异。

## 可信 AI 契约

1. 发送给模型的上下文必须受当前租户、资源和权限约束。
2. 只读建议与会修改数据的动作必须有明确差异。
3. 破坏性、计费、权限和批量动作必须由用户确认，不能由生成文本自动执行。
4. 失败要说明影响范围和恢复方式；成功遵循一个事件一个主反馈面的规则。
5. AI 输出不能绕过服务端授权、审计日志或数据脱敏。

界面生成和验收规则见[设计原则](/zh-cn/guides/design-principles/)与
[界面生成规范](/zh-cn/guides/interface-generation/)。
