---
title: AI 界面组件
description: 基于 ChatProvider 的对话、建议、命令和洞察组件
---

svadmin 提供 `ChatDialog`、`SmartSuggest`、`AICommandBar`、`CopilotPanel`、
`InsightCard`、`AnomalyBadge` 和 `VoiceInput`。它们共享 Core 的
`ChatProvider`，但不会替代权限、数据域和审计边界。

## 配置 ChatProvider

```ts
import { setChatProvider } from '@svadmin/core';

setChatProvider({
  async sendMessage(messages) {
    return fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }).then((response) => response.body);
  },
});
```

## 组件

- `ChatDialog`：浮动对话窗口，支持流式 Markdown、上下文和动作。
- `SmartSuggest`：在字段内提供低打扰建议。
- `AICommandBar`：为命令面板增加自然语言查询。
- `CopilotPanel`：当前页面的上下文助手。
- `InsightCard`：把有边界的数据摘要为可读洞察。
- `AnomalyBadge`：标记相对基线的异常值。
- `VoiceInput`：通过浏览器语音识别输入文本。

## 可信 AI 契约

1. 发送给模型的上下文必须受当前租户、资源和权限约束。
2. 只读建议与会修改数据的动作必须有明确差异。
3. 破坏性、计费、权限和批量动作必须由用户确认，不能由生成文本自动执行。
4. 失败要说明影响范围和恢复方式；成功遵循一个事件一个主反馈面的规则。
5. AI 输出不能绕过服务端授权、审计日志或数据脱敏。

界面生成和验收规则见[设计原则](/zh-cn/guides/design-principles/)与
[界面生成规范](/zh-cn/guides/interface-generation/)。
