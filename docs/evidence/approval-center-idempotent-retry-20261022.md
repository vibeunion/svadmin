# 审批中心原样重试的幂等标识

## 续接约定

- parent: `approval-center-refresh-feedback-20261022.md`
- source: 用户要求按既有企业级范围继续完善和验收。
- reason: 每次确认生成新键，网络失败后的原样重试无法复用同一次提交的标识。
- goal: 同一加载上下文中保留最近一次提交，原样连续重试复用幂等键。
- scope: `ApprovalCenter.svelte`、对应单文件测试、本证据与路线图。
- non-goals: 不实现服务端去重、跨刷新持久化或跨标签页请求恢复，不修改 Provider 协议。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

```gherkin
Given 同一审批提交发生网络失败或返回非法回执
When 用户不改动载荷并再次确认
Then 请求复用原幂等键且保留版本、动作、意见与目标

Given 上一次提交失败
When 用户修改意见或目标后再次确认
Then 新载荷使用新幂等键

Given 上一次提交失败后取消弹窗
When 在同一加载上下文重新打开并提交相同载荷
Then 请求仍复用最近一次提交的幂等键

Given 提交成功或列表重新加载或 Provider/请求作用域切换
When 用户发起后续提交
Then 不复用此前提交的幂等键
```

## 验证状态

- `packages/ui` 中执行
  `bunx vitest run src/components/approval-center.test.svelte.ts`：19/19 通过。
- 覆盖三类提交异常的原样重试、非法回执后的取消/重开、意见变化、
  转交目标去空白与变更、刷新/Provider/请求上下文/成功后的新提交键。
- `git diff --check` 通过。
- Bohr 独立复核未发现 P0/P1/P2 阻断；按建议补齐“旧作用域成功迟到后，
  新作用域原样重试仍使用新作用域已有键”的回归并通过。
- 成功后的新键同时由版本升级保证，成功快照清理仅由源码复核确认。
- 真实服务端去重、并发、浏览器、读屏和发布验收未完成。

标识只保留最近一次提交，生命周期截至重新加载或成功；不承诺跨刷新持久化，
也不替代服务端版本校验与幂等处理。
