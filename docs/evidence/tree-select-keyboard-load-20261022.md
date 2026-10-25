# TreeSelect 连续键盘与共享加载

## 任务约定

- parent/source：企业级 UI 批次二、TreeSelect 禁用加载契约 / 用户持续目标。
- reason：此前没有自然连续键盘的消费者证据；本轮浏览器复现打开后的焦点回跳。
- scope：TreeSelect、tree-select 单文件测试、enterprise fixture、本文与路线图。
- risk/orchestration：medium / managed，主线程单写入者，Hume 只读复核。
- 不修改全局 Popover、上游依赖、Provider 接口、样式或其他未提交改动；不提交、发布或部署。

## 验收场景

1. Given 无搜索的多选树，When Enter 打开并连续方向键/Space 导航选择，
   Then 焦点保留在操作节点、父项显示半选、折叠不误提交，Escape/重开可回焦。
2. Given 懒加载父节点，When Right 展开后收到宿主回执，
   Then busy 消失、子项可用，显式 Space 选择前不提交。
3. Given 展开请求进行中，When Space 选择当前父项或祖先，
   Then 共用同一请求，不报虚假失败，完整成功后只提交一次；
   请求拒绝则不提交，可显式重试。
4. Given 搜索命中懒加载父项，When Tab 进入结果并按 Right，
   Then 发起加载，不因搜索自动展开状态跳过加载，也不自动选择。
5. Given 初始聚焦正在进行，When 宿主因树项 focus 事件卸载组件，
   Then 不再访问已失效面板，也没有 pageerror。

## 实现与证据

- 原实现 Chromium 首次场景在 Space 后 ArrowUp 失败；临时调用栈进一步捕获
  Backend 之后被 `FocusScope.#handleOpenAutoFocus` RAF 聚焦回 Engineering。
  加日志的单次通过不是修复证据；重复运行再次失败（1 failed / 9 not run）。
- 本组件阻止延迟自动聚焦，tick 后仅在面板外焦点时进入搜索框/首节点；
  关闭回调 tick 后仅在确实关闭时回焦绑定触发器，避免重挂载回焦覆盖导航。
- `ChildLoad.promise` 共享包含结果写入、作用域校验和清理的完整请求；
  新级联选择加入已有展开请求时更新所属 selection，保留禁用退休路径。
  重复展开不重复切换 expanded 状态。
- 键盘分支判断使用原始 optionMap 节点；搜索中的懒节点 Right 可以显式加载。
- 浏览器用真实源码组件，除首次 trigger.press 外全部使用 page.keyboard，
  不在中途 `.focus()`；宿主回执由 fixture 控件 dispatchEvent 触发，
  不是模拟面板外用户点击或真实网络 Provider。
- 临时 focus 原型日志已移除。
- Hume 二次只读复核指出初始聚焦第二次 await 后未复查面板。
  已增加 mounted/open/面板引用与连接状态检查，并添加卸载场景。
  复核未独立运行测试；其他建议仍见下方未关闭项。
- 新卸载 fixture 曾因 svelte:window 非顶层编译失败，导致一次浏览器超时；
  移至顶层后重新完成下方全部矩阵，不计失败运行作通过。

验证（最终退出 0）：

- `packages/ui`：早期焦点/加载增量的
  `bun run test src/components/tree-select.test.svelte.ts` 为 66/66。
- `scripts/fixtures/enterprise-ui`：早期五场景矩阵为 60/60；
  后续键盘/ARIA 增量及最终总矩阵迁移到
  `tree-select-tab-aria-20261022.md`，不重复累计。
- `git diff --check` 通过。

## 尚未关闭

- 真实读屏与完整 ARIA 认证；已选标签/清空控件已改为无嵌套原生按钮，
  删除后回焦及跨浏览器鼠标证据见 `tree-select-tab-aria-20261022.md`。
- 完整 onlyLeaf 模式矩阵；250 节点 End/Home/Tab 已获后续浏览器证据，
  不代表任意大树或所有虚拟滚动方式。
- 关闭弹层期间级联选择的业务语义、真实 Provider 授权/取消、消费者发布包。
- 搜索只匹配父项时的全部交互与隐藏后代选择策略，不由懒节点专项外推。
- 共享展开请求加入级联后的禁用恢复/同键树替换/loader 替换组合、
  父子选择所有权交接已补齐 14 项直接组件回归，单文件现为 90/90，
  见 `tree-select-tab-aria-20261022.md`；对应真实 Provider 与浏览器组合仍待验收。
- 点击外部输入框/另一实例的回焦优先级，以及搜索返回匹配叶子后的连续选择
  尚未做浏览器验收。当前搜索场景只确认加载完成，不声称子项选择。

本轮只关闭上述自然键盘、搜索加载和共享请求契约，不关闭 TreeSelect 全部能力，
也不关闭企业级 UI 整体路线图。
