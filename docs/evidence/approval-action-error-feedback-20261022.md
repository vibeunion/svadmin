# 审批操作错误反馈

## 续接约定

- parent: `task-submit-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: ApprovalActionCard 的通过、驳回、转交 catch 直接展示 Provider 异常。
- goal: 三个审批动作统一失败文案，保留输入草稿、必填门禁和重试恢复。
- scope: `ApprovalActionCard.svelte` 及其现有单文件测试。
- non-goals: 不修改审批 Provider 协议、权限、并发、状态迁移或服务端幂等。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收结果

1. 通过、驳回、转交抛出诊断、空 Error 或非 Error 时，均显示
   `common.operationFailed`，不暴露原文。
2. 驳回原因和转交目标为空时仍阻止提交；失败后保留输入并允许再次提交。
3. 第二次提交成功后关闭对话框；再次打开时草稿和旧错误均已清理。
4. `bunx vitest run src/components/approval-action-card.test.svelte.ts`：
   **13/13 通过**。
5. `git diff --check`：通过。

测试为回调级本地契约，不证明真实审批服务、权限、并发冲突、浏览器、读屏或
发布验收。
