# TreeSelect 外部焦点与实例切换

## 续接约定

- parent：`tree-select-tab-aria-20261022.md`；source：用户持续完善企业级规范。
- reason：旧关闭回调无条件回焦，缺少外部输入和另一实例的连续操作证据。
- goal：外部输入能继续输入、切换第二实例关闭第一面板且进入第二搜索框，
  Escape 仍回到第二触发器。
- scope：TreeSelect、现有 TreeSelect fixture/spec、证据和路线图。
- risk/orchestration：medium / managed，主线程单写入者、Hume 只读复核。
- non-goals：不改全局 Popover、选择载荷、Provider、onlyLeaf、样式、发布部署。

## 验收路径

1. Given 第一树打开，When 点击可见的外部输入并连续键入，
   Then 面板关闭、输入内容留在外部输入，焦点不被旧触发器抢走。
2. Given 第一树再次打开，When 点击第二实例触发器，
   Then 第一面板关闭、第二面板打开，只有一个 dialog；
   连续键入进入第二实例搜索框。
3. Given 第二实例正在搜索，When Escape，
   Then 第二面板关闭且焦点回第二触发器。
4. 原有 TreeSelect 键盘、指针、删除/清空、异步和卸载场景不退化。

## 诊断与实现

- 最初 fixture 的外部输入被展开面板遮住，实际未点击成功；将外部控件置于
  第一实例上方后才获得有效复现，未使用 force click 或中途手动 focus。
- 修复前 Chromium 在关闭后连续键入，外部 input 仍为空。
- 只跳过关闭回焦仍失败；上游 FocusScope 会在关闭前拦回焦点。
- 保存外部交互目标；关闭完成后，只有当前焦点在 body 或旧实例控制区/面板
  内时才恢复该目标，目标必须仍连接。若新组件已获得焦点，不覆盖它。
- window focusin 在焦点离开当前控制区/面板时关闭旧实例，保留外部目标。
  打开时清理上次关闭来源；关闭回调检查 mounted/open。
- 新场景最初误用精确名称 Search；实际词条为 Search...，修正名称但保留
  连续输入和焦点断言。DOM 模拟环境没有可靠完成外部 dismiss，撤回临时
  单测，以真实浏览器路径为直接证据。

## 验证

- `packages/ui`：`bun run test src/components/tree-select.test.svelte.ts`，
  **94/94**，退出 0。
- `scripts/fixtures/enterprise-ui`：
  `bunx playwright test -c playwright.tree-select.config.ts --grep 'preserves outside' --max-failures=1`，
  Chromium/WebKit/Firefox × 桌面/窄屏，**6/6**。
- 完整同文件浏览器回归：
  `bunx playwright test -c playwright.tree-select.config.ts --max-failures=1`，
  78/78；包含本轮场景、原有键盘/异步/卸载/虚拟化和删除清空场景。
- Hume 只读复核：确认不能在第二实例已取得焦点后强制回焦旧实例；
  最终实现保留目标但只在焦点仍落在旧实例或 body 时恢复，未发现阻断问题。
  复核未独立运行测试；极端事件时序与跨第三方浮层组合仍不由本专项证明。
- `git diff --check` 通过。

这是本地源码消费者证据，不等于发布包、真实读屏、真实 Provider 或完整
企业级规范验收；跨 iframe、Shadow DOM 与任意第三方浮层组合不在上述证明中。
