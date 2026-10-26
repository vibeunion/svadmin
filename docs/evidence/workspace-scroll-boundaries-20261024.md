# B3-09 工作区滚动边界（慢加载 / 真实水平 owner / 取消）

## 主线程独立复验（2026-10-24）

- 后续适配器跨实例清理修正后，主线程重建 UI，再独立复跑同一专属 spec：
  **24/24（2.5m）**、exit 0、无 skip，是最新产物回归；下条 2.4m 为此前
  滚动修正的独立结果，不累计。适配器 **20/20** 及失败存储边界见
  `../evaluations/b3-09-tab-eviction-decision-20261023.md`。
- 独立复跑修正版 `playwright.workspace-tabs.config.ts`：**24/24**，
  exit 0，**2.4m**，无 skip；Chromium（23 个桌面场景、1 个既有 390px 边界场景）。
  本计数不与 pi 的 24/24 或初版 21/21 累计。
- 当前源码审查确认：不可达快照仅在恢复 pending 时保留；取消后允许采集新位置；
  observer 增量注册并在结束时清理；水平轴消费真实 table-container。
- 主线程曾在初版 21/21 通过后独立复现“用户回到 0，切换后又变 14”，该问题
  已纳入最终取消、切换、刷新回归，不能用初版通过结果作为最终证据。
- 两个目标文件定向 ESLint `--max-warnings 0`、`git diff --check` 均 exit 0。
  `WorkspaceTabsPage` 与直接编辑消费者以 svelte2tsx 转换，开启 strict、
  exactOptionalPropertyTypes、noUncheckedIndexedAccess、
  noPropertyAccessFromIndexSignature、skipLibCheck:false，完整目标语法及语义
  诊断 **0**。首次漏载 `vite/client` 导致 CSS side-effect import 诊断，补齐实际
  Vite 环境声明后通过；未过滤诊断或修改业务源码规避。
- 已核对测试专用生产包装两文件移除，页面与 spec 没有遗留临时诊断日志。
- 证据限制：滚轮及切换/刷新是真实浏览器操作；新增按键和 pointer 取消分支使用
  合成事件及受控 DOM 变更，不称实机滚动条拖动。关闭/离开无页面错误及源码
  cleanup 不等于已统计 SPA 卸载后的所有观察者数量；该边界仍需独立验收。

## 环境与任务契约

- 目标环境：本地 example 消费者；未访问远端生产或测试主机。
- parent: `workspace-tabs-consumer-20261024.md` 的“完整滚动边界”缺口
- orchestration: managed medium；唯一 writer 为 pi，主线程独立验证
- 写入范围：`example/src/features/workspace/**`、`e2e/workspace-tabs.spec.ts` 与本文档
- 非目标：跨窗口同步、真实后端/Provider、生产存储、全局组件 API、其他文档

## 现有协议边界（先给证据）

- `WorkspaceTabsPage.svelte` 的 `snapshotTab` / `restoreTab` 只在适配器快照中保存
  `scrollTop` 与 `scrollLeft`，并在活动标签切换或初次身份 hydrate 后恢复。
- 恢复使用 `requestAnimationFrame` 最多 60 帧重试；超过约 1 秒的消费者慢加载
  会在目标位置达到前停止，之后必须由真实内容尺寸变化继续驱动。
- `.workspace-tabs__scroll[data-workspace-scroll]` 是垂直滚动 owner（`overflow:auto`）；
  AutoTable 内部的 `.svadmin-table-container[data-slot="table-container"]` 才是
  `overflow-x:auto` 的真实水平滚动 owner。
- 适配器 `storage` 可为 `null`，此时仅内存保存；`sessionStorage` 探测失败返回
  `undefined`，不阻断当前会话内标签切换。本轮验证不宣称跨刷新恢复。
- 关闭标签和组件卸载已有 generation/disposed 保护，新增的尺寸监听、DOM 变更
  监听和用户取消监听都必须显式清理。

## 主线程独立复验发现（本轮修复目标）

主线程的旧 21/21 虽然通过，但额外 Chromium 真实探测复现了取消后旧位置复活：

1. `1280x420`、`pageSize=20` 时 accounts 真实 `scrollTop=68`。
2. 刷新到 `1280x500` 后仍保留旧快照 `68`，而当时 `maxTop=14`。
3. 用户滚轮回到顶部 `0`，恢复被取消。
4. 切到 deals 再切回 accounts，`scrollTop` 变成 `14`。

根因不是恢复窗口，而是 `snapshotTab` 无条件拒绝采样“旧快照不可达”的标签：
用户取消后切换标签时，当前位置 `0` 永远写不回快照，旧的不可达 `68` 继续存活，
下一次恢复再被 clamp 到 `14`。修复后只在恢复真正 pending 时保留不可达快照；
用户滚动取消后切换必须采集当前位置。

同时审查 `setupRestore` 发现：每次 attempt 都 `ResizeObserver.disconnect()` 再
`observe()`，每次观察都会再次投递初始通知并重新调度，静止页面也会无限帧轮询。
本轮改为增量观察（只 observe 新目标、unobserve 消失目标），并用 `MutationObserver`
覆盖真正的内部内容晚挂载；外壳尺寸不变时也由内部真实内容 resize 驱动。

## 验收 Gherkin

```gherkin
Feature: Workspace scroll restoration boundaries

  Scenario: 慢加载超过 60 帧后仍恢复到保存位置
    Given 活动标签已保存真实垂直滚动位置
    When 消费者布局延迟超过 60 帧后才显示真实列表内容
    Then 内容可滚动后仍恢复到保存的 scrollTop
    And 关闭该慢加载标签后不再有迟到恢复或页面错误

  Scenario: 非活动标签刷新后慢加载，再切回时恢复
    Given 刷新前非活动标签保存了真实滚动位置
    When 刷新后该标签内容延迟显示，用户先停留在其他标签，随后切回
    Then 该标签在内容可滚动后恢复其独立位置

  Scenario: 真实水平滚动 owner 被捕获和恢复
    Given AutoTable 的 table-container 自身产生真实横向溢出
    When 用户横向滚动该容器并刷新
    Then 恢复的是 table-container 的 scrollLeft，而不是外层假位置

  Scenario: 用户主动滚动取消迟到恢复
    Given 刷新后保存位置因布局变化暂时不可达，恢复仍在重试
    When 用户主动滚轮滚动
    Then 迟到恢复被取消，用户位置不被旧快照覆盖

  Scenario: 取消后切换并刷新不复活旧位置
    Given 用户已取消一个不可达旧快照的迟到恢复
    When 用户切到其他标签再切回，然后刷新
    Then 保存的是取消后的当前位置，旧位置不得复活

  Scenario: 静止页面不重复 observe 或轮询
    Given 恢复因快照不可达而 pending 超过 60 帧
    When 页面保持静止
    Then 不再持续 observe/disconnect ResizeObserver
    And 不再持续调度 requestAnimationFrame 轮询不可达位置

  Scenario: 关闭和卸载取消恢复
    Given 慢加载标签的恢复尚未完成
    When 用户关闭该标签或离开工作区页面
    Then 不留下尺寸监听、DOM 监听、滚动监听或动画帧回调
```

## 受控布局延迟说明

上一轮为延迟挂载新增的测试专用生产包装
`WorkspaceListPane.svelte` / `workspace-layout-delay.ts` 已移除，恢复
`WorkspaceTabsPage.svelte` 直接消费 AutoTable。受控布局延迟改放在 Playwright
的 style/DOM 夹具内：真实 AutoTable 内容照常渲染和请求数据，只对
`[data-workspace-scroll] > *` 临时 `display:none`，到达延迟后移除样式。

- 不伪造网络、Provider、宽高数值、滚动数据或生产组件 API。
- 不改变生产页面的 sessionStorage 协议；旧的 `sessionStorage` 延迟键已删除。
- 该夹具只证明“真实内容晚显示后的布局恢复”，不是真实网络或后端慢查询验收。

## 执行结果

### 红测（修复前可复现）

- 本轮新增取消回归
  `cancelled late restore does not resurrect the old position after switching and reload`
  在修复前失败：`Expected: 0 / Received: 14`，精确复现主线程的
  取消 -> 切换 -> 返回复活问题。
- 新增确定性 observer/rAF 用例
  `pending unreachable restore stops observing and scheduling after the bounded window`
  对临时旧式 `disconnect()/observe()` 基线失败：1.5 秒静止窗口内
  `observe` 从 `346` 增长到 `528`，证明旧实现每秒都在重复观察和调度。
- 既有慢加载和真实水平 owner 红测（上一轮基线）仍保留：
  `Expected: 68 / Received: 0`、`Expected: 402 / Received: 0`，
  分别对应旧 60 帧窗口结束后不再恢复，以及从外层读取假水平位置。

### 绿测

- 专属 workspace spec：
  `bunx playwright test --config playwright.workspace-tabs.config.ts --reporter=line`
  **24 passed / exit 0 / 约 2.7m**，无 skip。既有 21 例全部保留，新增 3 例全部执行：
  - 取消后切换并刷新不复活旧位置
  - 静止超过 60 帧后不重复 observe / 不持续 rAF 轮询
  - 只有滚动意图按键和滚动条 pointer 拖动才取消恢复
- 修复后单独复跑 observer/rAF 用例：**1 passed / exit 0**。
- 定向 ESLint（`WorkspaceTabsPage.svelte`、`e2e/workspace-tabs.spec.ts`）
  `--max-warnings 0` exit `0`；`example` 的 svelte-check 为
  **0 errors / 3 个既有无关 dashboard 警告**。
- `git diff --check` 与两个未跟踪目标文件的
  `git diff --no-index --check /dev/null <file>` 均无空白错误。
- 未运行全仓测试、全仓 check、发布构建或部署。

### 修复边界

- 恢复仍沿用现有适配器协议：`scrollTop` 为外层垂直 owner，`scrollLeft` 为
  AutoTable 内部 `[data-slot="table-container"]` 的真实水平 owner；没有改
  `AutoTable` 或全局组件 API。
- `snapshotTab` 仅在 `restoringTabId` 真正 pending 且旧快照不可达时拒绝覆盖；
  用户滚动取消后（无 pending）切换会采集当前位置。
- 首段保留 60 帧有界重试；之后由增量 `ResizeObserver` 观察外壳、真实水平容器
  和所有 table-container，并由 `MutationObserver` 补齐晚挂载内容。
- 用户 `wheel` / `touchstart` 取消恢复；`keydown` 只在方向键、PageUp/PageDown、
  Home/End、空格等滚动意图键时取消；滚动条 `pointerdown` 拖动也取消。
- 关闭标签与组件卸载会使 generation 失效，并断开 ResizeObserver、
  MutationObserver、事件监听和动画帧。
- 慢加载期间若旧快照仍不可达且恢复 pending，切换前不把当前假 `0` 写回快照；
  隐藏标签因不可测量也不会覆盖未挂载内容。

### 仍不覆盖

- 未验证真实后端/Provider 慢查询、生产存储、跨窗口同步（需产品存储策略）。
- 未验证跨浏览器/跨引擎、真实移动设备、读屏、发布与部署。
- Playwright 受控 `display:none` 夹具不等于真实慢网络；本轮不等同 B3-09
  或整体企业级完成声明。
