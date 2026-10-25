# 角色权限设置反馈与切换

## 续接约定

- parent: `approval-action-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: RolesSettings 读取/保存直接透传 Provider 异常；权限读取失败会自动重复
  请求；角色下拉切换没有可靠触发父级权限加载。
- goal: 角色/权限读取显式错误与 Retry，读取失败锁定权限操作，保存失败脱敏并
  回读；修复原生角色选择向父级的传播。
- scope: `RolesSettings.svelte`、`PermissionMatrix.svelte` 的角色选择传播、
  `scoped-provider-actions.test.svelte.ts` 及本文。
- non-goals: 不修改 AuthProvider RBAC 协议、服务端授权、并发冲突解决或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 本轮补充：读取状态与矩阵呈现

- 角色列表读取期间仅显示 loading，不渲染“暂无角色”或空权限矩阵。
- 当前角色权限读取期间仅显示 loading，不把所有权限误显示为未勾选。
- 权限读取失败时保留角色选择区，表格区域显示脱敏错误与 Retry；失败期间不渲染权限操作按钮。
- 保存失败触发回读时，旧权限按钮从 DOM 中移除；回读成功后重新渲染按钮并恢复操作。

## 验收结果

1. 角色读取诊断、空 Error、非 Error 显示通用错误并可 Retry，不显示原文。
2. 权限读取失败不自动循环；矩阵锁定，Retry 成功后恢复；缺少读取能力显示
   能力缺失，缺少写入能力保持不可编辑。
3. 保存失败统一 Toast，回读失败时仍锁定并等待显式 Retry；成功回读后恢复。
4. 原生角色下拉切换会触发父级权限加载；旧角色迟到失败不会污染新角色。
5. `bunx vitest run --config ./vitest.config.ts src/components/scoped-provider-actions.test.svelte.ts`：
   **20/20 通过**。
6. `bunx vitest run --config ./vitest.config.ts src/components/permission-matrix.test.svelte.ts`：
   **5/5 通过**。
7. `git diff --check`：本轮通过。
8. Bohr 只读复核未发现 P0/P1 阻断；建议补充的角色选择区保留及当前角色稳定
   断言已补入上述测试。本轮未重新执行浏览器测试。

## 浏览器验收补充

新增真实 `RolesSettings` 消费者夹具，使用可控的本地 AuthProvider 请求，不把组件
单元 stub 结果冒充真实服务。浏览器覆盖：

- 角色读取失败、显式 Retry、恢复后重新进入权限读取；
- 权限读取 pending/失败期间不渲染未知权限操作，角色 select 与侧栏仍可用；
- 保存失败后的权限回读期间卸载旧按钮，成功回读后恢复；
- 切换到新角色后，旧角色迟到的拒绝不会污染当前角色。

验证命令：

```sh
bunx playwright test -c playwright.roles-settings.config.ts --max-failures=1
```

结果：Chromium/WebKit/Firefox × desktop/narrow **12/12**，无 pageerror。
截图输出位于 `test-results/browser-RolesSettings-*/roles-recovered.png`。
这是本地可控 Provider 的真实浏览器验收，不等同真实 RBAC 服务、屏幕阅读器、
并发冲突或发布部署验收。

只读复核后补齐权限读取 pending 时的角色入口可见性（桌面侧栏、窄屏 select）
与当前值断言，再次完整复跑 12/12。旧请求隔离证据仅涉及角色切换，不代表
Provider/tenant 替换或缺少读取能力路径的浏览器验收。

随后补齐缺少 `getRolePermissions` 的浏览器路径：角色仍可加载和切换，权限区
显示能力不支持，不显示授权按钮或无效 Retry。桌面侧栏 Enter、窄屏 select
切换后读取计数仍为 1（仅角色列表），写入计数为 0。沿用上述命令，
三场景 × 三引擎 × 两视口最终 **18/18**。本次只扩充本地夹具和测试，
没有变更生产逻辑，也不证明真实 RBAC 或 Provider/tenant 替换验收。

随后扩充 Provider 与 tenant 分别替换的浏览器验收：旧权限读取在新作用域完成
加载后分别 Resolve/Reject。两侧角色 ID 相同但授权不同，断言新角色名、授权
状态、可编辑状态、Toast、错误面板和请求计数均不被旧响应污染。
主线程单 writer，Bohr 只读复核；不修改生产组件。
沿用上述命令，七场景 × 三引擎 × 两视口最终 **42/42**。
该证据补齐前述本地作用域读取隔离，不包含在途写入替换、真实服务端租户边界、
读屏或发布验收。

## 在途保存隔离补充

续接上述读取隔离，范围仍限本地浏览器夹具与测试；主线程唯一 writer，
Bohr 只读 verifier。夹具在写入开始时捕获目标数据和提交快照，支持显式完成
或拒绝，避免测试自身把旧写入迁移到新作用域。

Provider/tenant 分别替换后发起新保存，再完成或拒绝旧保存，验证：

- 新保存仍禁用，旧 finally 不解除新请求的锁。
- 旧失败不在新作用域 Toast，不触发权限回读，不改写新授权。
- 新保存完成后恢复可编辑，载荷仍是新角色权限，写入总次数为 2。

沿用专属浏览器命令，十一场景 × 三引擎 × 两视口最终 **66/66**，退出 0。
没有修改生产组件。结果不证明后端取消、服务端写入原子性、跨用户冲突或真实
租户授权；仅证明当前客户端在这一完成顺序下隔离旧写回执。

测试使用本地 Provider stub，不证明真实 RBAC 服务、授权边界、并发冲突、浏览器、
读屏、跨浏览器或发布验收。
