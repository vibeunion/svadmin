# TreeSelect 节点禁用期间的异步加载

## 任务约定

- parent: `tree-select-expansion-20261021.md`；source: 企业级规范持续目标。
- reason: 节点或祖先在懒加载期间被禁用时，旧请求仍保持 busy，迟到结果缺少
  明确的节点级退休边界。
- goal: 节点禁用集合变化时，立即退休对应加载与级联选择尝试；恢复后新请求
  可以重新开始，旧回执不能写入。
- scope: TreeSelect、tree-select 单文件测试、本证据和路线图。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不修改 Provider API、权限服务协议、虚拟化预算或发布状态。

## 验收

Given 节点或其祖先正在加载子节点，When 宿主将其禁用，
Then 原请求退出 busy，迟到成功不渲染，也不触发 onchange。

Given 节点随后恢复可用，When 再次展开或选择，
Then 发起新请求；新回执可正常显示或提交，旧回执仍被丢弃。

## 验证

- 旧实现回放中，self/ancestor × expand/select 四条新增用例均失败，均表现为
  禁用后仍保持 `aria-busy=true`。
- 修复将 `disabledValues` 纳入现有 loads、loadingValues、loadErrors 和
  selectionAttempt 的生命周期检查；加载请求额外记录所属级联尝试，避免无关
  禁用节点变化取消正常父级选择。
- 独立复核指出嵌套父级选择的误报边界，已补充加载中子节点被禁用后迟到
  成功与失败两例；修复后 `bunx vitest run src/components/tree-select.test.svelte.ts`：
  62/62。
- `git diff --check`：通过。
- Bohr 二次只读复核确认嵌套级联 P2 已关闭，未发现新增阻塞；复核未独立运行
  测试。本地回归不等同于真实 Provider 权限、跨浏览器或读屏验收。
