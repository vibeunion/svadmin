# TreeSelect 展开状态契约

## 任务约定

- parent: enterprise-ui-plan.md 批次二树选择；source: 企业级规范持续目标。
- reason: `expanded: true` 被永久叠加到交互状态，预展开分支不能折叠。
- goal: 默认展开可由用户覆盖，搜索暂时展开不破坏用户状态，导航不修改选择。
- scope: TreeSelect、tree-select 单文件测试、本文及路线图。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不修改加载协议、虚拟化预算、Provider 或发布状态。

## 验收

Given expanded=true 的父节点，When 点击折叠或按 ArrowLeft，
Then 子项消失且 aria-expanded=false，重新展开后子项恢复。

Given 用户已折叠分支，When 搜索子节点再清空搜索，
Then 搜索期间显示匹配项，清空后恢复折叠，value/onchange 不被修改。

Given 组件或祖先节点禁用，When 从现有面板尝试折叠，
Then 不通过键盘绕过禁用保护。

## 结果

- `packages/ui/src/components/tree-select.test.svelte.ts`：56/56 通过。
- 覆盖预展开分支的鼠标/键盘折叠、搜索临时展开恢复、禁用节点守卫和外部
  树替换；另覆盖其他分支懒加载完成时不重置已折叠分支；选择值与 `onchange`
  均保持不变。
- 先红后绿：旧实现的三个新增回归失败，其余 47 项通过；实现修复并扩充边界后
  最终 56/56 通过。
- `git diff --check`：通过。
- 本地测试不等同于跨浏览器、读屏或真实异步 Provider 验收。
