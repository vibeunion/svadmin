# 级联选择键盘路径

## 续接契约

- parent: `cascader-disabled-contract-20261021.md`；source: 企业级规范持续目标。
- reason: 既有级联面板缺少方向键跨列浏览能力。
- goal: 无鼠标完成列内定位、进入分支、返回父级及退出；浏览不等于提交。
- scope: Cascader、同名单文件测试、本文和路线图证据索引。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不修改 Provider、异步树协议、样式体系或发布状态；不宣称读屏认证。

## 验收

Given 当前列包含禁用选项，When 使用上下键或 Home/End，
Then 跳过禁用项，只移动当前实例的焦点。

Given 父级启用且有子项，When 按右键，
Then 展开该分支并聚焦第一个可用子项，不触发 onchange。

Given 已进入子级，When 按左键，
Then 返回当前分支父项；顶层左键关闭面板并回焦触发按钮。

Given changeOnSelect 开启，When 只使用方向键浏览，
Then 不提交值；Enter/Space 继续交由原生按钮激活处理。

## 证据

- `packages/ui/src/components/cascader.test.svelte.ts`：16/16 通过。
- Chromium 1440x900、390x844：跨列右键、父级左键、顶层关闭回焦、
  Home/End、Enter/Space、Escape 均通过，`pageErrors: []`。
- 真实浏览器验证脚本与页面：`output/playwright/cascader-disabled-contract-20261021/verify-keyboard.js`
  和同目录 Vite fixture；服务仅使用本地测试数据。
- `git diff --check`：待最终复核。
- 本轮不宣称完整级联异步加载、跨浏览器或读屏软件认证。
