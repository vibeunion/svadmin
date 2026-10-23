# RelationPicker 资源授权拒绝后的旧页/旧选择边界（2026-10-23）

## 范围

- parent: `enterprise-ui-acceptance-matrix-20261022.md` B2-07 实体与关系选择器
- source: 用户继续企业级 UI 验收矩阵；reason: B2-07 原始要求包含“资源授权”，
  已有证据只覆盖关闭清理、搜索模式、跨页失败恢复和跨浏览器基础路径，尚未
  明确验证“资源授权拒绝后不保留旧页记录或旧选择”
- scope: `packages/ui/src/components/RelationPicker.svelte`（只读）、
  `relation-picker.test.svelte.ts`、`scripts/fixtures/enterprise-ui/RelationPickerFixture.svelte`、
  `relation-picker.spec.ts`
- Delegation Decision: medium / native；单一写入者，确定性单文件测试加专属
  浏览器矩阵验证，未修改 core、RBAC、Provider 协议、依赖或全局样式，
  不提交、推送、发布或部署。
- 远程环境：本轮未连接任何远程主机，未做部署或生产验证，不涉及环境归属判定。

## 只读核对结论

`RelationPicker.svelte` 在授权拒绝路径上的现有行为：

- `allowed = permission.allowed && authSession.available`，`allowed` 为 false 时
  `selectedValues`、`availableOptions` 都返回空，`begin()` 直接返回，触发器
  `disabled`。
- 作用域观察 effect 在 `observedAllowed && !currentAllowed` 时置
  `valueInvalidated = true`、清空 `draftValues`、关闭 Dialog，并调用
  `resetSearch()`，后者把 `loaded` 置空、`page` 回到 1、搜索串清空。
- 因此拒绝期间不会渲染旧页记录或旧选中摘要；恢复授权后 `valueInvalidated`
  保持为 true，宿主未重新下发值前不回显旧选中，候选列表从第 1 页重新读取。

未发现需要修改生产组件的缺口，本轮 `RelationPicker.svelte` 未改动。

已有断言覆盖但不完整的部分：既有用例覆盖“挂载即无 list 权限”“授权恢复后
旧受控值保持失效直到宿主替换”“权限变化时丢弃草稿搜索”，但没有一个用例
同时覆盖“已加载第 2 页 + 已有草稿 + 已回显受控值 → 拒绝 → 恢复”这一组合，
也没有断言拒绝期间不发请求、恢复后不回到旧页码。本轮只补这一条窄用例。

## 验收约定

Given 已回显受控值 `[9]`、已勾选第 1 页草稿并加载了第 2 页记录，
When 资源 list 授权被拒绝，
Then Dialog 关闭、触发器禁用、旧选中摘要与旧页记录都不渲染，拒绝期间不新增
`getList` 请求，且不触发 `onchange`。

Given 授权恢复，
When 重新打开 Dialog，
Then 不出现旧第 2 页记录，第 1 页草稿为未勾选、搜索为空，恢复后的 `getList`
请求都从第 1 页开始，旧受控值在宿主重新下发前不回显，仍不触发 `onchange`。

## 过程与红绿

1. 先补组件用例，未改生产组件。首次运行 **1 failed / 31 passed**，失败原因是
   用例复用了只匹配 `/Select/` 的 `open()` 助手，而该场景已回显 `Row 9`，
   触发器文案是 `Edit`，属于断言对象错误，不是产品缺陷。
2. 改为按 `Edit` 触发器打开首个 Dialog，并补“拒绝期间请求数不变”“恢复后
   请求页码均为 1”的断言后，**32/32** 通过。
3. 专属浏览器 fixture 增加授权拒绝/恢复按钮和 deny-only `AccessControlProvider`
   （允许态仍为 `null`，与既有用例路径一致），新增一条拒绝场景，先定向
   `-g "revoked"` 运行 **6/6**，再跑完整专属配置 **30/30**。

## 结果

- 组件定向测试：

  ```sh
  cd packages/ui
  npx vitest run --config ./vitest.config.ts src/components/relation-picker.test.svelte.ts
  ```

  **32/32**，退出码 0。

- 浏览器专属矩阵：

  ```sh
  cd scripts/fixtures/enterprise-ui
  npx playwright test --config playwright.relation-picker.config.ts
  ```

  **30/30**，退出码 0（5 个场景 × Chromium/WebKit/Firefox × 1440px 桌面、
  390px 窄屏）；新增拒绝场景定向运行 6/6。

- 浏览器覆盖：Dialog 内勾选 `Row 1`、`Load more` 出现 `Row 2` 后拒绝授权，
  Dialog 关闭、触发器禁用、页面不残留 `Row 1` 文案、提交计数保持 0；恢复
  授权后重新打开，`Row 2` 不存在、`Row 1` 未勾选、搜索框为空、提交计数仍为 0。
- `git diff --check` 通过。

### 主线程独立复核

- 主线程单文件 `relation-picker.test.svelte.ts`：**32/32 passed、exit 0、11.96s**。
- 主线程定向运行 `playwright.relation-picker.config.ts -g revoked`：
  **6/6 passed、exit 0、8.7s**，覆盖 Chromium/WebKit/Firefox 的桌面与窄屏。
- 主线程 `git diff --check`：exit 0。
- pi 的完整配置 **30/30** 与主线程定向 **6/6** 分开记录，不合并为同一次
  浏览器验收；主线程未重复完整 30 项矩阵。

## 边界

- 本轮拒绝通过替换授权 Provider 注入，且第 2 页在拒绝前已返回；
  不证明同一 Provider 的原位撤权通知，也未覆盖撤权期间在途请求的迟到回执。
- 授权拒绝由本地 `AccessControlProvider` stub 注入，不证明真实 RBAC 策略、
  服务端资源授权、令牌刷新或权限撤销延迟；也不证明服务端分页一致性。
- 未证明真实请求取消/超时、并发冲突、租户服务端隔离、屏幕阅读器或发布包
  消费；DOM/Dialog/键盘自动化不等同于读屏认证。
- 本轮未运行全仓单测、typecheck、构建或发布验证；结论只覆盖上述单文件与
  专属浏览器配置。
- 未改动 `RelationPicker.svelte`；若后续 `useCan` 或查询作用域语义变化，需
  重新验证拒绝期间不发请求、恢复后从第 1 页读取这两个不变式。
