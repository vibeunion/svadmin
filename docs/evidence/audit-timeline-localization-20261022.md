# 审计时间线默认文案

## 续接约定

- parent: `approval-center-idempotent-retry-20261022.md`
- source: 用户要求继续完成整体企业级规范。
- reason: AuditTimeline 的默认空态、操作者前缀和状态文案没有随语言切换。
- goal: 默认文案接入现有词条；保留宿主业务文案和状态边界。
- scope: AuditTimeline、对应单文件测试、中英文词条及证据/路线图。
- non-goals: 不改共享 StatusBadge、不解析宿主时间戳、不增加审计 Provider。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

```gherkin
Given 默认空审计时间线
When 在中英文之间切换
Then 空态标题和说明随语言变化

Given 含操作者和默认状态标签的事件
When 切换语言
Then 默认标签与操作者前缀变化，事件标题、说明和时间戳不变

Given 宿主自定义空态或事件标签
When 切换语言
Then 自定义内容保留，不被默认词条替换

Given 审计加载、失败或无权限，且保留有旧事件
When 切换语言或显式重试
Then 旧事件仍隐藏，默认反馈更新，重试只调用宿主回调
```

## 验证状态

- 在 `packages/ui` 执行
  `bunx vitest run src/components/content/audit-timeline.test.svelte.ts`：
  **17/17 通过**。
- 覆盖默认空态、操作者前缀与五种状态标签中英文往返，宿主覆盖、空说明、
  loading/error/forbidden/filtered-empty 下隐藏旧事件，以及并列语言作用域隔离。
- 只读复核发现 actor 通过共享插值器会改写 `$&`、`$$` 的 P2；
  已局部改为翻译前缀与姓名独立渲染，新增特殊字符/HTML 原样显示回归并通过。
- Bohr 再次只读复核确认该 P2 已关闭，限定范围无新增问题；
  `git diff --check` 通过。
- 真实审计服务、浏览器、读屏及发布验收尚未完成；不把组件测试视为整体详情工作台验收。
