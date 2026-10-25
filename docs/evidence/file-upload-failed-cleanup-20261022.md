# FileUpload 失败尝试临时会话回收

## Task Contract

- parent: `enterprise-ui`；source: 用户继续 + 代码审查退回；reason:
  `FileUpload` 已登记 ID 的失败上传在 `finally` 从 `attempts/controllers` 移除，
  之后 `remove/replace/unmount/scope-change` 可能遗漏临时会话回收。
- review-source: 审查退回指出成功路径的 `updateCurrent -> updateItem -> onChange`
  在 `finally` 之前发出，若宿主在收到 success 时同步卸载，`retire` 仍能取得
  active attempt 而误回收成功附件；并指出成功后 `onChange` 同步抛错会经 `catch`
  把成功对象登记进 `pendingCleanup`。本轮只按该路径补红测试与最小守卫，
  不扩大为通用异常框架，也不新增任务范围。
- goal: 已登记 `uploadId` 的失败尝试，在移除、替换、卸载、作用域替换时仍能
  使用该尝试捕获的原始 `cancelUpload` 回调回收临时会话；用户重试前不得丢失
  失败临时会话；成功附件绝不能被取消回调删除；同一次尝试的自动回收最多一次，
  迟到回收结果不得污染新尝试。
- non-goals: 不修改 `FileUpload` 公开 Props、`UploadSession`、`UploadCancellation`
  的 reason 枚举或 `UploadItem` 结构；不修改样式、原生 FormData、上传协议、
  服务端清理实现、其他组件与测试文件；不新增 reason 值。
- scope: `packages/ui/src/components/FileUpload.svelte`、
  `packages/ui/src/components/file-upload.test.svelte.ts`、本文、
  `docs/evaluations/enterprise-ui-plan.md`、
  `docs/src/content/docs/zh-cn/guides/enterprise-component-migration.md`。
- risk/orchestration: medium / managed；writer 为 `pi`，主线程为 verifier，
  负责审查与验收复核。

## 现状确认

`process()` 的 `finally` 在 `current()` 时删除 `controllers` 与 `attempts`。
失败后条目仍保留在列表中可重试，但对应 `UploadAttempt` 已被丢弃：
`retire()` 只能看到 `controllers` 中的活动尝试，因此
`remove/replace/unmount/scope-change` 都不会调用该失败尝试已捕获的
`cancelUpload`，其临时上传会话泄漏；重试创建新尝试后旧会话同样被丢弃。
成功尝试在正常路径下会于 `finally` 之前从 `attempts`/`controllers` 移除，
但审查发现该保护依赖“通知返回后仍是同一状态”：`updateCurrent -> updateItem ->
onChange` 同步执行，宿主若在 success 通知中同步卸载，`retire()` 仍能从
`attempts` 取到活动尝试并补上 `unmount` reason，从而误删成功附件；若宿主在
success 通知中同步抛错，`catch` 会把已成功的尝试当作失败并登记进
`pendingCleanup`。`cleanupStarted` 只允许一次自动回收，但失败尝试原本没有进入
可回收集合。

## 处理选择

失败尝试若已通过 `setUploadId` 或回执拿到 `uploadId` 且宿主提供了
`cancelUpload`，则在失败收尾时登记为待回收尝试（不立即回收，因为用户可能重试）。
该登记只在未 abort 的真实失败时发生；显式取消已由 `retire()` 处理。

重试复用同一 `item.id`，会在创建新尝试前先用既有 reason `replace` 回收旧失败
尝试：语义与“单文件模式重新选择文件表示替换”一致，即新尝试替换旧尝试，
不新增 reason 值、不改变公开契约。其后再创建新尝试，旧回收的迟到结果被
`latestAttempts` 与 epoch/upload 守卫隔离。重试只**发起**异步回收，不等待服务端
回收完成才开始上传。

成功路径的最小守卫是新增尝试级 `succeeded` 标记：在 `updateCurrent` 通知宿主
之前先锁定成功语义，`cleanupAttempt()` 对已成功尝试直接返回；成功后的同步
卸载与同步抛错都不会调用 `cancelUpload`，也不会把成功对象放入
`pendingCleanup`。该守卫只覆盖成功路径，不扩展为通用异常处理或重试框架。
取消后迟到成功的路径仍先经 `register` 登记 `uploadId`，回收不受成功守卫影响。

## 验收（Given/When/Then）

1. Given 上传已登记 `uploadId` 后失败，When 用户移除该条目，Then 使用原尝试
   捕获的 `cancelUpload` 调用一次，`reason` 为 `remove`，`idempotencyKey`
   为该失败尝试的键。
2. Given 同上失败条目处于单文件模式，When 选择新文件替换，Then 旧失败尝试以
   `reason: 'replace'` 回收一次，新文件正常上传。
3. Given 同上失败条目，When 卸载组件或替换 `upload` 作用域，Then 分别以
   `reason: 'unmount'` / `'scope-change'` 回收一次，卸载后不再触发 `onChange`。
4. Given 已登记 `uploadId` 的失败条目，When 用户点击重试，Then 旧失败尝试以
   `reason: 'replace'` 回收且仅一次，新尝试使用新的幂等键，旧回收的迟到
   resolve 不改变新尝试状态、不产生额外 `onChange`。
5. Given 上传成功且登记了 `uploadId`，When 移除条目或卸载组件，Then
   `cancelUpload` 从未被调用，成功附件不被删除。
6. Given 失败临时会话已随卸载回收，When 之后再次发生终态变化，Then
   同一尝试不会二次自动回收。
7. Given 上传成功且已登记 `uploadId`，When 宿主在 success 的 `onChange` 中
   同步卸载组件，Then 该尝试已锁定成功语义，`cancelUpload` 不被调用，
   成功附件不被删除。
8. Given 上传成功且已登记 `uploadId`，When 宿主在 success 的 `onChange` 中
   同步抛错，Then 条目仍为 success，且不会进入 `pendingCleanup`；之后移除
   或卸载都不调用 `cancelUpload`。此守卫仅覆盖成功路径，不构成通用异常框架。

## 验证

- 第一轮红：原文件 36 例 + 新增 7 例 = 43 例。修复前同一单文件命令结果
  **6 failed | 37 passed (43)**；37 passed 含新增的“成功对象不被回收”保护例，
  6 个 failed 覆盖 remove/replace/unmount/scope-change/retry/一次回收，
  失败点均为 `cancelUpload` 调用 0 次，确认失败尝试上下文丢失。
  （更早记录误写为“既有 37 + 新增 6”，已按实际文件用例数更正。）
- 第一轮绿：同一命令 **43/43 passed**，含既有 36 条生命周期、i18n、原生
  FormData 与迟到回执用例。
- 第二轮（审查退回）红：再增 2 条成功路径用例（成功同步卸载、成功
  `onChange` 同步抛错）后共 45 例，修复前结果
  **2 failed | 43 passed (45)**：同步卸载路径误调用 `cancelUpload` 一次，
  同步抛错路径把条目降级为 error 并进入待回收。
- 第二轮绿：同一命令 **45/45 passed**。
- 失败后 scope-change 用例改为使用两个不同 spy：断言旧尝试捕获的
  `cancelUpload` 调用一次，新作用域的 `cancelUpload` 调用零次，
  避免同一 spy 无法区分回调来源。
- 重试语义补充：重试仅**发起**旧失败尝试的异步回收（`replace`），不会等待
  回收完成才上传；新尝试立即以新幂等键开始，旧回收的迟到结果被
  `latestAttempts`/epoch/upload 守卫隔离。
- 进度记录：主线程曾误用 `bun test`（无 DOM 环境），已改用包内
  `bunx vitest`，不计为产品失败。
- 修复中还修正了作用域替换的无关通知：待回收失败尝试不进入“活动取消”映射，
  作用域替换不再为未变化的失败条目额外触发 `onChange`（由新增 scope-change
  用例的调用计数暴露）。
- `git diff --check` 通过。
- 仅运行该单文件（包内 `bunx vitest run --config ./vitest.config.ts
  src/components/file-upload.test.svelte.ts`）与 `git diff --check`；
  未运行全仓测试、浏览器、类型检查或构建。

## 边界

- 仅证明宿主 `cancelUpload` 回调的客户端调用契约；未验证真实后端回收、
  鉴权、持久化删除或生产清理。
- 未覆盖并发多标签页、浏览器关闭、服务端过期回收或 `cancelUpload` 内部重试。
- 未覆盖 `upload` 在失败后迟到登记 `uploadId` 的路径（`settled` 后登记被忽略，
  与既有“失败后不再接受新 ID”行为一致）。
- 未覆盖宿主 `cancelUpload` 同步抛错之外的网络部分失败语义；`cleanupStatus`
  只表示回调结果。
