# B3-09 工作区生命周期真实 SPA 与跨浏览器（2026-10-24）

> 本文记录 2026-10-24 的 26 用例阶段；当前 `e2e/workspace-tabs.spec.ts`
> 已包含 27 个用例，当前三引擎清单为 81 个测试。最新源码与后续草稿、
> 横向滚动证据以 `docs/evaluations/enterprise-ui-closeout-20261024.md`
> 为准，本文的 77/78、78/78 仅保留为历史阶段结果。

## 环境与任务契约

- 目标环境：本地 example 消费者；未访问远端生产或测试主机。
- parent: `workspace-scroll-boundaries-20261024.md` 的“SPA 卸载观察者统计”边界
- orchestration: managed medium；唯一 writer 为 pi，主线程独立验收
- 写入范围：`e2e/workspace-tabs.spec.ts`、新增
  `playwright.workspace-tabs.cross-browser.config.ts`、本文档；只有证据证明
  生产缺陷时才最小修改 `example/src/features/workspace/WorkspaceTabsPage.svelte`
- 非目标：跨窗口读屏/同步、真实后端或 Provider、移动端新场景、全局组件 API、
  提交/推送/部署、全仓检查

## 前置事实

- 当时的 `playwright.workspace-tabs.config.ts` 是 Chromium 桌面单引擎，24 个用例，
  其中 1 个在 spec 内主动切到既有 390px 视口；本轮不新增移动范围。
- `WorkspaceTabsPage.svelte` 在活动标签恢复期间注册 `ResizeObserver`、
  `MutationObserver`、垂直 scroller 上的 wheel/touchstart/keydown/pointerdown
  捕获监听，以及 `requestAnimationFrame` 重试；组件还会在 `window` 上注册
  `pagehide`。正常 `onDestroy` 走 `cancelRestore()`，但此前没有独立证据统计
  SPA 卸载后的这些资源。
- 旧证据中的 reload 路径不能证明“真实菜单离开再返回”是 SPA；本轮必须用真实
  sidebar 菜单点击，并用同一 document 标识排除刷新/新文档。

## 验收 Gherkin

```gherkin
Feature: Workspace lifecycle across real SPA navigation

  Scenario: Pending unreachable restore leaves no workspace-only resources behind
    Given 活动账号标签保存了一个真实滚动位置
    And 切换到其他标签并把视口改小到旧位置不可达
    When 切回账号标签形成 pending 恢复
    Then 只属于 workspace 的 ResizeObserver、MutationObserver、scroller 监听、
         rAF 与 pagehide 计数可被观察到
    When 点击真实菜单离开 /workspace
    Then document 标识保持不变
    And 上述 workspace 资源计数归零或回到进入前基线
    When 对已离开的旧 scroller 继续派发 wheel/keydown/pointerdown/touchstart 并变更子节点
    Then 不调度新的恢复 rAF，也不重新注册观察者
    When 视口恢复后点击真实菜单回到 /workspace
    Then 查询和滚动位置恢复，且 document 标识仍相同

  Scenario: Real menu round trip restores query and scroll without reload
    Given 在 /workspace 中保存账号搜索与真实滚动位置
    When 点击真实菜单离开到其他页面再返回 /workspace
    Then 全程 document 标识不变
    And 账号搜索与滚动位置恢复
```

## 测量契约

- 浏览器包装原生 `ResizeObserver`、`MutationObserver`、
  `EventTarget.prototype.addEventListener/removeEventListener`、
  `requestAnimationFrame/cancelAnimationFrame`，只读计数，不改页面行为。
- Resize/Mutation 目标仅在 workspace 根节点内计数；scroller 监听用进入时记录的
  scroller WeakSet 计数，离开后仍能准确扣减；rAF 用调用栈归因到
  `WorkspaceTabsPage` 并统计在途数量，跨引擎已验证可归因。
- pagehide 统计 window 上活动监听数，并与进入 workspace 前的基线比较，避免把
  其他组件的全局监听误报为 workspace 泄漏。
- 全局监听计数覆盖 `window` 的 `pagehide`/`hashchange`/`popstate` 与
  `document` 的 capture `click`；新增三类监听只用调用栈归因到
  `WorkspaceTabsPage` 的注册计数，并以监听实例 identity + capture 作为键，
  避免不同 capture 变体或重复注册互相顶替。用例在进入前记录基线，pending 时
  对 hashchange/popstate/document capture click 与非零聚合做正断言，离开后逐项
  回到基线，重新进入后与首次挂载计数相等，证明没有叠加。
- 离开后对已脱离文档的旧 scroller 派发旧事件与子树变更；若旧监听/观察者仍在，
  它们会在同一 JS 任务内调度 rAF，计数必须不增加。
- 不使用内部 Svelte API、生产测试开关或 page.goto 冒充 SPA 离开/返回。
- 布局延迟夹具不再在 HTML 加载时注入 `setTimeout` 自行移除样式；样式只由测试
  在目标状态确认后显式 `release(resource)`。需要越过 60 帧恢复窗口的用例必须在
  页面已挂载且 `expectLayoutHidden` 成功后，等待真实 `requestAnimationFrame`
  61 帧再 release；关闭 pending 标签在关闭后 release；其余不依赖延迟时序的用例
  直接 release。这样不会因 Vite 首次冷启动或引擎调度差异提前移除样式。

## 执行结果

- 26 用例阶段主线程最终独立验收（审查修补后的源码）：完整专属矩阵 **77/78**，exit 1，
  7.7m；Chromium **26/26**、WebKit **26/26**、Firefox **25/26**。
  Firefox 的 `closing and eviction clear only their tab while reload restores allowed state`
  在 `page.reload()` 等待 `load` 时超过 60 秒，并非后续状态断言失败。
  同配置、同引擎隔离复跑该例 **1/1**，exit 0，11.5s。trace 有长时间开发
  WebSocket 记录；不能将隔离重跑与完整矩阵拼成一次 78/78。
  本轮新增 SPA 两例和全部受影响的布局场景在三个引擎均通过。
- 主线程目标 ESLint `--max-warnings 0` 与 `git diff --check` 均 exit 0；
  页面及真实编辑器的完整目标严格语义/语法诊断 **0**，包括
  `exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`，未过滤错误。
- 预览 `http://127.0.0.1:5187/#/workspace` 已重新启动，并用真实登录和侧栏菜单
  确认工作区渲染、页面错误为零。截图路径：
  `output/playwright/workspace-preview-20261024.png`。这是本地 example smoke，
  不是线上验收。下面的 78/78 是审查增强前的独立历史运行。
- 真实菜单 SPA 回归先红后绿：
  1. 首次运行 2 个新用例均在真实菜单离开处失败。浏览器事件日志显示：链接默认
     hash 已变成 `#/health_office`，但 workspace 的空态/URL 同步 effect 立即
     `history.replaceState` 回 `/workspace?tab=crm_accounts`，所以真实菜单无法
     离开。修复为仅在 `parsed.resourcePath === 'workspace'` 时同步 tab hash。
  2. 修复导航后，pending 资源清理用例通过；普通往返用例仍失败：离开前
     scroller 为 `124`，但 sessionStorage 快照仍是 `0`。SPA onDestroy 时根节点
     已断开，最新位置丢失。增加离开导航前（真实 anchor 捕获点击与
     hashchange/popstate 兜底）在根节点仍连接时采集位置后，两用例转绿。
- 既有 cleanup 本身正确：pending 用例在离开后测得 workspace-only
  ResizeObserver/MutationObserver/scroller 监听归零，pagehide 回到进入前基线，
  在途 workspace rAF 归零；对已脱离文档的旧 scroller 派发旧事件与子树变更后
  没有新增恢复 rAF。没有为制造红绿而修改恢复或清理实现。
- 定向 Chromium：**26/26**，exit 0，3.1m，无 skip。
- 审查增强前的专属跨浏览器配置完整复跑：**78/78**，exit 0，**7.7m**，无 skip。
  Chromium 桌面 **26/26**、WebKit 桌面 **26/26**、Firefox 桌面 **26/26**；
  其中每引擎都包含既有 24 例与新增 2 例，390px 用例仍由 spec 内既有场景覆盖，
  未新增移动项目或移动视口场景。首次跨引擎运行曾出现 1 例 Firefox 既有登录
  等待超时，单独定向复跑通过，最终完整复跑 78/78 无失败。
- 目标 ESLint（spec、新配置、页面）`--max-warnings 0` exit 0；
  `git diff --check` exit 0。新增 spec/配置用局部 tsc 配置检查 exit 0；
  `WorkspaceTabsPage.svelte` 用 svelte-check 定向 tsconfig 检查
  **0 errors / 0 warnings**（运行环境对无关 fixture vite 配置的加载告警不计入
  目标诊断）。未运行 example 全量 check 或全仓检查。
- 主线程 review 修复后的定向复验（2026-10-24 续）：只运行本 spec 中受影响的
  5 个用例 × Chromium/WebKit/Firefox 桌面，**15/15** 通过，exit 0，2.7m，
  无 skip。三引擎均通过新增全局监听的非空正断言、离开回基线与重新进入不叠加
  断言；布局延迟用例均在 hidden 确认后显式 release，越过 60 帧的用例等待真实
  61 个 rAF 帧。定向 ESLint `--max-warnings 0` exit 0；两个目标文件无空白错误。
  本轮未重复运行全部 26 例或 78 例；当前 spec 已增至 27 例，不能把该历史
  结果外推为当前 81 例全量通过。
- 范围限制：未覆盖真实后端/Provider、真实读屏器、跨窗口同步、移动端新增场景；
  workspace 页面错误监听为空只代表本 spec 路径，不等于所有生产遥测。

## 2026-10-26 当前矩阵复验

- 清理上一轮遗留的 `127.0.0.1:5186` fixture Vite 进程后，重新执行
  `bunx playwright test --config playwright.workspace-tabs.cross-browser.config.ts`。
- 当前源码共 **81/81 passed**，exit `0`，耗时 **10.3m**，无 skip；Chromium
  desktop **27/27**、WebKit desktop **27/27**、Firefox desktop **27/27**。
  三引擎均实际执行 `closing and eviction clear only their tab while reload restores
  allowed state`，不再依赖 Firefox 隔离重跑拼接历史结果。
- 本次结果覆盖当前 spec 的 27 个用例，包含真实菜单 SPA 往返、标签关闭/驱逐、刷新
  恢复、草稿恢复边界、滚动取消与 390px 视口场景。`derived_inert` 仅为 Vite/Svelte
  开发期 console warning，不导致测试失败；最终以 exit code 和 81/81 统计为准。
- 该结果收口 B3-09 的本地 workspace 生命周期跨引擎验收，但不扩大为真实后端/Provider、
  生产 storage、跨窗口同步、真实读屏、发布部署或在线验收；上述边界仍保持未验收。
