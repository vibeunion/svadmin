---
title: 反馈与页面提示
description: Toast、FeedbackNotice、Alert 与反馈归属
---

一个事件只能有一个主反馈面。

## Toast

Toast 用于无需进入页面工作流的短时全局反馈：

```ts
const notification = useNotification();
notification.success('保存成功', 3000, { key: 'record:42:save:7' });
```

内置 Toast Host 默认折叠，最多显示三个，并将事件 key 作为 Sonner ID。
key 必须标识一个事件。

## FeedbackNotice

`FeedbackNotice` 只用于未解决的页面上下文、必须执行的操作或阻塞状态。
它支持 `info`、`warning`、`danger`，不提供 success tone。

```svelte
<script lang="ts">
  import { Button, FeedbackNotice } from '@svadmin/ui';
</script>

{#snippet action()}
  <Button size="sm">补充字段</Button>
{/snippet}

<FeedbackNotice
  tone="warning"
  message="还有 3 个必填字段需要补充。"
  {action}
/>
```

阻塞主工作流的失败使用 `priority="blocking"`，组件会提供 assertive alert
语义。

## Alert

`Alert` 是兼容性底层原语，用于边界明确的内联错误或警告。不要把 success
变体作为页面级普通变更成功的持久确认。

完整决策表和信息预算见[界面生成规范](/zh-cn/guides/interface-generation/)。
