# Toast and Page Feedback / Toast 与页面反馈

One event must use one primary feedback surface. 一个事件只能使用一个主反馈面。

| Situation / 情况 | Surface / 反馈面 |
| --- | --- |
| Routine success / 普通成功 | 3-second Toast / 3 秒 Toast |
| Completed page state / 页面进入完成状态 | New local/page state, Toast disabled / 新状态，关闭 Toast |
| Action required / 需要操作 | `FeedbackNotice` warning |
| Blocking error / 阻塞错误 | `FeedbackNotice` danger/blocking |
| Field error / 字段错误 | Inline field message / 字段内联消息 |

```ts
const notification = useNotification();
notification.success('Saved', 3000, { key: 'record:42:save:7' });
```

The built-in host is collapsed and limited to three visible Toasts. Keys identify
events, not translated messages.

内置 Host 默认折叠，最多显示三个 Toast。key 表示事件身份，不能使用翻译文案
作为全局去重依据。

Use `successNotification: false` when the page owns a completed state.
页面自行展示完成状态时，使用 `successNotification: false` 关闭自动 Toast。
