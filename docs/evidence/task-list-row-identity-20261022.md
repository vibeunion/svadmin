# 任务列表行身份

## 续接约定

- parent: `task-list-browser-20261022.md`
- source: 用户继续完善企业级规范。
- reason: TaskList 按数组索引复用行；刷新重排会更换行内动作的任务 ID，
  清除原任务的 pending 锁并使其可再次触发，而不是随原任务保留。
- goal: 业务任务身份驱动行复用，允许重复 ID 时仍保持出现序号稳定。
- scope: TaskList、QueryClient 交互测试、本证据和路线图。
- non-goals: 不修改任务协议、不假设 Provider 返回唯一 ID、不替代服务端去重。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

```gherkin
Given 两条任务正在列表中且第一条 Cancel 尚未完成
When Provider 返回相同记录的重排结果
Then pending 状态跟随任务 ID，不能跟随原数组位置

Given 列表包含重复任务 ID
When 渲染或重排列表
Then 每条记录保留独立行，不出现重复 key 或丢行

Given 任务被替换为另一条记录
When 旧动作回执迟到
Then 新行不继承旧动作 pending 或错误
```

## 验证状态

- `packages/ui` 执行
  `bunx vitest run src/components/task-list-query.test.svelte.ts`：20/20 通过。
- 使用真实 QueryClient 的列表重排，验证 DOM 行身份与 pending 跟随原任务，
  另一行保持可操作；另覆盖重复 ID 不丢行、替换行不复用和迟到回执隔离。
- 重复 ID 的出现序号只用于避免 key 冲突，不声称能识别同 ID 的不同业务实体；
  按 ID 操作仍由现有 Provider 契约定义。
- Bohr 独立复核无 P0/P1；指出重复 ID 在重排/插入/删除时无法保持具体重复记录
  的身份这一 P2 边界。已补重复 ID 重排与移除不丢行回归，但没有以对象引用或
  展示字段伪造业务身份；同 ID 的独立实体需要宿主提供唯一 ID，本轮不关闭该边界。
- 本轮变更的真实 Provider、浏览器、读屏和发布验收未完成。
