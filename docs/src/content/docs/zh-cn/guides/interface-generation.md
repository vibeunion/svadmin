---
title: 界面生成规范
description: 信息预算、反馈归属、页面状态与 AI 验收规则
---

svadmin 使用 **Stripe-first 视觉语言**。外部设计系统只补齐特定行为与场景，
不能混合成一套新的视觉主题。

## 参考体系

| 参考对象 | 参考内容 | 不复制的内容 |
| --- | --- | --- |
| Stripe | 层级、克制、中性表面、精确的产品语气 | Stripe 自身品牌表达 |
| [Refine](https://refine.dev/docs/) | Resource、CRUD 流程、Provider 状态、变更归属 | React 实现与 UI 主题 |
| [Ant Design](https://ant.design/components/overview/) | 反馈选择、表单、结果页、空/加载状态、数据密度 | 蓝色主题、圆角、阴影、组件外观 |
| [shadcn/ui](https://ui.shadcn.com/docs) | 可访问组合、语义变体、源码归属组件 | React API 与默认样式 |
| [Carbon](https://carbondesignsystem.com/) / [PatternFly](https://www.patternfly.org/components/) | 企业通知生命周期、错误/空状态、运营页面布局 | 品牌 token 与视觉身份 |
| [Metronic](https://keenthemes.com/metronic/tailwind/demo1/) | 页面家族覆盖与缺失场景 | 视觉风格、装饰、排版 |

Refine + Ant Design 适合作为**行为参考实现**：Refine 管理资源与变更状态，
Ant Design 提供成熟的反馈和数据模式。svadmin 应在 Svelte 中复现契约，
而不是复刻界面。

## 页面信息预算

每个生成页面先回答四个问题：

1. 页面唯一的主要工作流是什么？
2. 哪个未解决状态会阻塞或改变工作流？
3. 每个事实、数字和状态由哪个界面位置负责？
4. 用户解决问题后，哪些内容必须消失？

从页头到主工作区，最多出现一个全宽、高权重的持久提示。说明文案只有在
补充约束、后果、范围或恢复路径时才有价值，不得复述标题、标签、按钮、
文件名、Badge、进度值或表格总数。

## 反馈决策表

核心不变量：**one event -> one primary feedback surface**。

| 情况 | 主反馈面 | 生命周期 |
| --- | --- | --- |
| 字段校验错误 | 字段内联消息 | 直到修正 |
| 成功且无需后续操作 | Toast | 3 秒 |
| 成功使页面进入完成状态 | 新的页面/局部状态，并关闭自动 Toast | 直到跳转或重新开始 |
| 结果不完整且需要用户处理 | `FeedbackNotice tone="warning"` | 直到解决 |
| 阻塞失败或权限边界 | `FeedbackNotice tone="danger" priority="blocking"` | 直到解决或关闭 |
| 仍然相关的非阻塞上下文 | `FeedbackNotice tone="info"` | 相关期间 |
| 可撤销变更 | Undoable Toast | 与撤销窗口一致 |

`FeedbackNotice` 有意不提供 success 变体。底层 `Alert` 为兼容性保留 success，
但不能作为页面级普通变更成功的默认方案。

当页面自行展示完成状态时，关闭 Hook 的自动通知：

```ts
const forgot = useForgotPassword({ successNotification: false });

const form = useForm({
  resource: 'orders',
  action: 'create',
  successNotification: false,
});
```

只有存在重复投递可能时才使用事件 key：

```ts
notification.success('委托单已保存', 3000, {
  key: `order:${orderId}:save:${revision}`,
});
```

key 表示事件身份，不能使用翻译后的提示文案作为全局去重依据。

## OCR 场景修正

OCR 完成后，文件名、识别字段数、已确认数量和表格已经证明识别成功，
不应再增加一个全宽、长期存在的成功横幅重复这些事实。

正确层级是：

- 识别成功使用 3 秒 Toast，或上传控件内的紧凑状态；
- “3 个字段待补充”是唯一持久、可行动的 warning notice；
- notice 旁最多放一个“去补充”主操作；
- 所有缺失字段补齐后，notice 立即消失。

## AI 生成验收门

出现任一情况即拒绝生成结果：

- 同一成功同时出现在 Toast、标题、说明、Alert、Badge 和数据中；
- 首屏出现多个高权重持久提示；
- 说明面板只是在描述附近已有的控件或结果；
- 卡片嵌套，或仅为装饰给页面分区加卡片；
- 反馈没有归属、没有消失条件，或包含多个主操作；
- 桌面或移动端存在重叠、裁切、横向滚动，或反馈挤走主操作。

新的 `create-svadmin` 项目会在根目录获得 `DESIGN.md` 和 `AGENTS.md`，
让编码 AI 在生成 UI 前直接读取并执行这些规则。

已有项目可以先预览，再仅补齐缺失文件，不会覆盖本地规范：

```bash
bunx @svadmin/create guidance .
bunx @svadmin/create guidance . --write
```
