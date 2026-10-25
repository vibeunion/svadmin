# Combobox 弹层关联

## 续接契约

- parent: `combobox-keyboard-recovery-20261021.md`；source: 企业级规范持续目标。
- goal: 触发按钮打开时关联当前实例的结果列表，关闭后移除悬空关联。
- scope: ComboboxField、combobox-field 单文件测试、本文及路线图。
- risk/orchestration: low / managed，主线程唯一 writer，确定性单文件验证。
- non-goals: 不修改查询、选择、权限、样式或焦点策略；不宣称读屏认证。

Given 页面有多个 Combobox，
When 打开任一实例，
Then aria-controls 指向本实例已挂载的 listbox，实例之间 ID 不重复。

Given 当前弹层关闭后重新打开，
Then 关闭期间没有 aria-controls，重新打开后复用本实例列表 ID。

## 证据

- 使用 Svelte 实例 ID 派生 listbox ID，传递到实际 Command.List。
- `bunx vitest run src/components/combobox-field.test.svelte.ts`：33/33，
  包含该文件内的局部严格 Svelte/TypeScript 检查。
- 覆盖鼠标/方向键打开、Escape 关闭、多实例切换及重新打开。
- `git diff --check` 通过。既有 svelte2tsx source-map 缺失警告仍出现，
  未阻断测试。
- 当前证明是 DOM 语义和类型契约，未新增真实浏览器截图或读屏验收，
  不能沿用历史截图推导本轮新增语义已被辅助技术正确消费。
