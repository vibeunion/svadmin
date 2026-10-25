# 任务列表选择交互

## 续接约定

- parent: `task-list-capabilities-20261022.md`
- source: 用户继续完善整体企业级规范。
- reason: 缺少 onSelect 时仍展示无效 Details；行内重试/取消冒泡到行选择；
  showActions:false 时只能鼠标点击行查看详情。
- goal: 详情能力匹配入口，行内动作不附带选择，隐藏操作列仍有原生键盘入口。
- scope: TaskList、task-list-query 单文件测试、本文和路线图。
- non-goals: 不改任务动作实现、服务端协议、列表视觉布局或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

```gherkin
Given 未提供 onSelect
When 渲染任务行
Then 不显示无效详情按钮

Given 提供 onSelect
When 点击行正文或详情按钮
Then 对当前任务只调用一次 onSelect

Given 提供 onSelect 且任务可取消或重试
When 点击行内任务动作
Then 执行对应动作，不同时选择行

Given 提供 onSelect 且 showActions:false
When 渲染任务列表
Then 标题提供可聚焦的原生按钮入口且不提交宿主表单
```

## 验证状态

- 在 `packages/ui` 执行
  `bunx vitest run src/components/task-list-query.test.svelte.ts`：**17/17 通过**。
- 新增行正文/Details 的单次选择、Retry/Cancel 不选择、回调移除后的入口清理、
  隐藏操作列时标题按钮可聚焦，以及 Details 的非提交表单语义。
- Bohr 独立只读复核确认无必须修复项；现有渲染按钮的冒泡已覆盖，
  防御性排除的 a/input/select/textarea/role=button 未逐类构造合成 DOM 测试。
- 真实浏览器 Tab/Enter/Space、读屏、任务服务和发布仍未验收。
