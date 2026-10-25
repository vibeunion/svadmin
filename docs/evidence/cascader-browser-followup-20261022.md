# Cascader 浏览器续接：焦点竞态修复与重复验证

## 本轮续接结果

- parent/source/reason：续接下方失败记录 / 用户“继续” / 连续键盘焦点不稳定。
- 范围：仅 Cascader 焦点生命周期、原浏览器单文件和本证据/路线图；
  不改全局 Popover、bits-ui、其他组件或样式，不提交、不发布。
- Delegation Decision：low / managed，当前 owner 单写入者，确定性验证。
  `agmesh automation status .` 因本机命令不存在未执行成功，未声称协调状态已更新。
- 验收场景：
  - Given 面板自然打开，When 连续右/右/左/左，Then 依次聚焦子/孙/子/父且不提交。
  - Given 根列聚焦，When 左键关闭后重新打开再 Escape，Then 两次关闭均回焦触发器。
  - Given 展开的分支变为叶节点，When 宿主更新 options，Then 后代消失且显式选择前不提交。
- 临时 focus 调用栈确认：原失败中 Child 之后的 Parent 聚焦来自
  `FocusScope.#handleOpenAutoFocus` 的 RAF；另观察到 `mount → unmount →
  #handleCloseAutoFocus`，以及退列删除聚焦节点触发 MutationObserver。
  不是 locator 失败；此前将该 RAF 栈说成 focus trap 的口头判断已更正。
- 修复：取消上游延迟打开聚焦，tick 后仅在焦点不在面板内时聚焦首个可用项，
  无可用项则聚焦面板；关闭聚焦同样在 tick 后检查真实 open 状态，再回焦触发器。
  左键退列先聚焦仍存在的父项，再删除子列，避免移除聚焦节点造成短暂回跳。
- 中间只接管打开聚焦仍失败；随后仅凭同步 open 拦截关闭回焦又暴露 Escape
  回焦失败。最终保留重新打开/Escape 断言，没有删断言、手动补焦或延时重试掩盖问题。
- 已移除临时 `HTMLElement.prototype.focus` 日志。

最终验证（均退出 0）：

- `packages/ui`：`bun run test src/components/cascader.test.svelte.ts`，18/18。
  初次误用根目录 `bun test` 未匹配该文件，不计入通过证据。
- `scripts/fixtures/enterprise-ui`：
  `bunx playwright test -c playwright.cascader.config.ts --project=chromium-narrow --grep 'navigates' --repeat-each=5 --max-failures=1`，5/5。
- 同目录：
  `bunx playwright test -c playwright.cascader.config.ts --repeat-each=2 --max-failures=1`，
  24/24，Chromium/WebKit/Firefox × 1440px/390px × 两场景 × 两次，无自动重试。
- `git diff --check` 通过。

本轮不覆盖真实读屏、完整 Tab/指针交互矩阵、动态叶节点移除后的焦点、
异步加载或分发包验收。以下失败记录保留为修复前历史证据。

## 修复前范围

- parent/source: 企业级 UI 路线图、叶节点边界 / 用户持续目标。
- 范围：enterprise fixture、单文件浏览器回归、本证据；生产组件未改。
- Delegation Decision: low / managed，单写入者，确定性测试；仅补测试证据。
- 验收：分支变叶节点后不显示残留后代、不自动提交；连续方向键浏览保持焦点且不提交。

## 修复前证据

- `packages/ui` 中 `cascader.test.svelte.ts`：18/18。
- 在 `scripts/fixtures/enterprise-ui` 运行：
  `bunx playwright test -c playwright.cascader.config.ts --grep 'removes stale' --max-failures=1`
  为 6/6，覆盖 Chromium/WebKit/Firefox × 1440px/390px。
- 叶节点场景验证：父/子/孙展开后宿主替换 options，子孙消失；
  此时回调计数仍为零；显式点击父节点后载荷为 `["parent"]`、回调一次。
  布局断言在提交后执行，不代表展开三列的布局或动态移除后的焦点验收。

## 修复前未通过项

- 完整配置重复运行：
  `bunx playwright test -c playwright.cascader.config.ts --repeat-each=2 --max-failures=1`
  退出 1，6 passed / 1 failed / 17 did not run，不能写成 24/24。
- 连续键盘场景间歇无法保持 Child 焦点，最初桌面也曾失败；
  最后重复运行在 Chromium 390px 右键进入子列后失败。
- 手动 focus、Locator.press、等待两个渲染帧均未可靠消除失败。
  最终回归不使用中途手动补焦，不跳过失败用例。
- 上游 bits-ui FocusScope 有 requestAnimationFrame 打开聚焦以及 MutationObserver
  在节点移除后回焦逻辑；临时观察曾见 Grandchild → Parent → Child。
  这只是排查依据，尚不足以认定根因。此前将失败直接归因于测试定位的判断撤回。
- 叶节点专项运行会覆盖默认 test-results，失败摘要保存在本文；
  完整键盘回归仍需修复并重复验证，不能由专项通过代替。

未执行真实读屏、异步加载协议、消费者发布或部署；整体目标仍在进行。
