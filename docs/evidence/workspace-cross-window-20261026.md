# Example 跨窗口标签集合同步证据

日期：2026-10-26

## 范围

本次只验证 example 消费方的 B3-09 跨窗口标签集合同步，不修改 `@svadmin/ui` 公共 API。

同步范围限定为同一 `sessionScope` 下的标签集合变化：打开、关闭和 LRU 淘汰。查询缓存、草稿、滚动位置和业务写入均不通过同步消息传播。

## 实现约束

- 使用按 `sessionScope` 隔离的 `BroadcastChannel`。
- 消息带协议版本、实例 `senderId`、单调 `revision` 和经过校验的 `tabIds`。
- 只有本地打开、关闭或淘汰触发状态发布；应用远端状态不会再次回发，避免旧集合覆盖新集合。
- 同版本消息按 `senderId` 做确定性仲裁；旧 `revision` 或旧实例状态被丢弃。
- `BroadcastChannel` 不可用时不建立同步通道，保留单窗口行为。
- dirty 标签收到远端关闭时保留本地标签，避免静默丢失未保存编辑。

## 验证命令与结果

```bash
bunx playwright test \
  --config playwright.workspace-tabs.cross-window.config.ts \
  --reporter=line
```

结果：隔离 worktree 初次验收通过，`1 passed (18.2s)`；主工作区独立复验通过，`1 passed (15.7s)`。

主工作区补充门禁：目标 ESLint 通过，`bun run --cwd example check` 通过（0 errors，3 个既有 warning），`git diff --check` 通过。

覆盖的真实双页面流程：

1. 同一 browser context 打开两个页面并进入同一工作区。
2. 页面 B 在 `crm_deals` 中输入 `Summit`。
3. 页面 A 先访问 `crm_deals`，再打开 activities 和 contacts，使 accounts 成为真实 LRU 淘汰目标。
4. 页面 B 收到标签集合、打开和淘汰变化；页面 A 关闭 contacts 后页面 B 同步关闭。
5. 页面 B 的 `Summit` 查询值和结果保持不变，证明未传播查询状态。
6. 两个页面均无 `pageerror`。

## 边界

- 这是 example 级消费方能力，不是 `@svadmin/ui` 公共跨窗口契约。
- `sessionStorage` 仍按页面隔离；跨窗口集合一致性依赖浏览器提供 `BroadcastChannel`。
- dirty 标签的安全策略是本地保留，因此远端关闭 dirty 标签时两个窗口可能暂时不完全一致。
- 本证据不覆盖真实认证、远程 Schema、生产服务、跨浏览器矩阵或完整 81/81 矩阵。
