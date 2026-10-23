# 任务动作默认失败反馈

## 续接约定

- parent: `task-time-display-20261022.md`
- source: 用户继续完善整体企业级规范。
- reason: 列表和详情未传 onError，Retry/Cancel 的已捕获失败没有可见反馈。
- goal: 无宿主错误回调时显示本地化通用提示，允许显式重试且不泄露诊断。
- scope: task-action、RetryTaskButton、CancelTaskButton、词条和动作单文件测试。
- non-goals: 不新增自动重试、不修改 Provider 协议或服务端幂等、不改变宿主回调契约。
- risk/orchestration: medium / managed；主线程唯一 writer，独立只读 verifier。

## 验收场景

```gherkin
Given 没有 onError 的重试或取消按钮
When Provider 拒绝或返回不匹配回执
Then 显示与按钮关联的通用提示，不展示诊断，不自动重复写入

Given 失败提示已显示
When 用户切换语言或显式重试
Then 语言变化更新提示而不请求，重试开始时清理旧错误，成功后不再显示

Given 操作失败或请求尚未返回
When 任务、租户或 Provider 作用域切换
Then 不把旧错误或迟到回执展示在新作用域

Given 宿主提供 onError
When 操作失败
Then 只调用既有宿主反馈，不叠加默认提示
```

## 验证状态

- 在 `packages/ui` 执行
  `bunx vitest run src/components/task-action.test.svelte.ts`：**38/38 通过**。
- 两类按钮均覆盖诊断/空 Error/非 Error/无效回执、按钮说明关联、语言更新、
  显式重试清理、任务/租户/Provider 变化、迟到失败以及宿主反馈不重复。
- Bohr 独立只读复核未发现生产实现阻断；access/session/router 的默认提示清理
  未逐项新增测试，共用既有 current 守卫，不将代码复核算作独立场景运行证明。
- 测试宿主仍使用真实 QueryClient 与本地 stub；真实服务、浏览器布局、读屏、
  发布包样式和发布仍未验收。
- 上述浏览器待验收状态由下列专项结果部分更新，不代表真实服务。

## 浏览器续接验收（2026-10-22）

- parent: 本文动作默认反馈实现。
- source/reason: 用户继续；补齐默认提示在真实浏览器内的失败与恢复证据。
- goal/scope: 仅调整 enterprise-ui fixture、其 browser.spec.ts 中任务场景及
  playwright.task-list.config.ts；不扩展生产组件或 Provider 协议。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。
- 验收：取消失败展示通用提示并关联按钮；原始诊断不展示；再次操作成功清理
  提示；失败和恢复均不触发行选择或外层表单提交。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.task-list.config.ts`：
  **10/10 通过**，包括既有四场景与新增失败恢复场景，分别运行于
  desktop 1440x1000 和 narrow 390x844。
- 新增场景同时检查 `pageerror`、提示与按钮的 `aria-describedby` 关联、
  提示可见性、恢复后移除说明关联、提示边界框及失败/恢复计数。
  新增 fixture 控件置于焦点起点之前，
  保留既有 Tab 顺序断言。
- Bohr 独立只读复核未发现 P0/P1 阻断；建议的显式可见性与恢复后
  `aria-describedby` 清理断言已补入同一专项。
- 人工检查 `output/playwright/task-list/desktop-action-failed.png` 和
  `output/playwright/task-list/narrow-action-failed.png`：提示完整换行，
  无文案遮挡；窄屏已滚动至操作列，左侧任务列未同时显示。
  恢复截图为同目录 `desktop-action-recovered.png`、
  `narrow-action-recovered.png`。截图为本地忽略产物，不纳入发布包。
- 随后增加默认隐藏的 failed task fixture，补齐 Retry 失败与恢复场景。
  专项配置新增 retry 匹配，重新执行后共 **12/12 通过**，仍包括
  desktop 1440x1000 和 narrow 390x844。
- Retry 场景检查错误提示可见、原始诊断隐藏、`aria-describedby` 关联、
  恢复后清理关联、重试计数、任务选择和外层表单提交均保持正确。失败截图为
  `output/playwright/task-list/desktop-retry-failed.png`、
  `output/playwright/task-list/narrow-retry-failed.png`，恢复截图为同目录的
  `*-retry-recovered.png`；人工检查显示完整提示，窄屏操作列通过内部横向滚动
  进入视野。初次行级截图未截到目标内容，已改为任务区域截图并复验。
- Retry 增量经 Bohr 只读复核无 P0/P1 阻断；Playwright 点击及显式滚动可自动
  将操作列移入视野，因此仅将截图与边界框作为可见性证据，不宣称用户触摸
  滚动路径已验证。既有独立横向滚动场景继续保留。
- 范围限制：Chromium、静态任务与 stub Provider、源码组件搭配既有构建 CSS；
  不把 fixture 中的再次调用等同于任务状态刷新、持久化恢复、服务端幂等或真实
  Provider 行为。`scrollIntoViewIfNeeded` 和设置 scrollLeft 不代表触摸手势
  验收。
- 仍未完成：真实服务、读屏、跨浏览器、发布包样式、
  发布及线上验收。整体企业级规范目标不因此关闭。

## 同任务重试/取消并发互斥（2026-10-22）

### 续接约定

- parent: 本文既有任务动作默认失败反馈。
- source: 用户继续实施 B3-08。
- reason: 同一任务的重试与取消此前各自维护 pending，两个按钮或重复挂载可同时写入；
  现有用例只覆盖单按钮重复点击，没有覆盖同任务跨动作互斥。
- goal: 同一任务只允许一个在途动作；失败释放同任务按钮；动作不改变任务选择；
  Provider 缺少能力时不显示不可用动作。
- scope: `task-action.svelte.ts`、`task-action.test.svelte.ts`、
  `task-action.test-host.svelte`、本文和 B3-08 矩阵。
- non-goals: 不修改 TaskProvider 协议、核心 hook、服务端幂等/取消语义、
  任务状态推导或发布流程。
- risk/orchestration: medium / native；当前唯一 writer 直接实现，确定性单测验证。

### 验收场景

```gherkin
Given 同一任务同时渲染重试和取消按钮
When 任一动作尚未返回
Then 两个按钮都不可再次触发，重复点击和兄弟动作都不会产生额外调用

Given 同一任务的重试失败
When 失败回执返回
Then 仅发起失败的动作显示脱敏错误，两个按钮恢复可操作，显式重试可开始第二次动作

Given 任务选择状态已存在
When 从列表行执行重试或取消
Then 不调用 onSelect，选择状态保持原值

Given Provider 未声明 retry 或 cancel
When 通过 TaskList 渲染对应任务
Then 不渲染不可执行的动作按钮
```

### 实现与验证

- 新增真实组件回归时先复现生产缺陷：单文件 Vitest 首次结果为
  **3 failed / 41 passed（44）**，退出码 `1`；失败集中在同任务 Retry/Cancel
  并发时兄弟按钮未禁用。
- 最小修复为任务动作模块级共享在途声明，按 Provider、任务、租户和认证会话隔离；
  重试与取消共用同一任务声明。初次实现中成功、失败、作用域变化和卸载都会释放
  声明；后续审查发现卸载释放会在 TaskList 状态切换时重开并发窗口，已改为仅由
  实际请求结算释放声明，作用域变化和卸载只停止结果交付。原有回执校验、缓存
  失效和迟到结果隔离保持不变。
- 新增用例同时断言：仅首个动作调用一次、重复点击/兄弟动作零额外调用、
  完成后可顺序执行另一动作、失败后兄弟按钮恢复、失败错误仅在发起按钮显示且
  显式重试清理、跨行动作不改变 `onSelect`/选择状态、缺少能力时不渲染动作。
- pi（本会话）修正前在 `packages/ui` 执行
  `bunx vitest run src/components/task-action.test.svelte.ts` 曾得到 **45/45 passed**；
  该结果属于修正前基线，不作为卸载声明确认修正后的结果。修正前中间版本曾为
  **44/44 passed**，补入 TaskDetails 能力缺失断言后为 45/45。
- 主线程修正后独立运行同一单文件：**49/49 passed**，退出码 `0`，duration `7.58s`；`git diff --check` 退出码 `0`。修正前启动的 45/45 运行属于旧基线，不与本次或 pi 结果合并。

### 卸载期间 claim 生命周期修正（2026-10-22）

- reason: 审查发现 `onDestroy` 删除 claim 会在真实 TaskList 中重开并发窗口：
  Retry 请求仍在途，任务记录从 failed 变为 running 后旧 Retry 卸载并释放 claim，
  新挂载的 Cancel 可再次提交。
- 红测：先在同一单文件补真实 TaskList 反例，Retry 使用 deferred，成功后 rerender
  同一任务为 running；旧实现下 Cancel 未禁用，点击产生额外请求。另有卸载后重新
  挂载同一任务仍应锁定的断言失败。执行
  `bunx vitest run src/components/task-action.test.svelte.ts` 得到
  **3 failed / 46 passed（49）**，退出码 `1`，duration `7.55s`。
- 修复：卸载和作用域变化只使结果交付失效，不删除全局在途声明；成功或失败进入
  `finally` 后才按 token 相等检查释放 claim，旧请求不会删除后来替换的新 claim。
- 新增断言覆盖：真实 TaskList 中 failed→running 后 Retry 卸载、Cancel 禁用且
  点击零请求、原 Retry 成功或失败结算后才解锁、动作不触发选择；Provider、
  tenant、taskId 不同仍可独立发起；卸载后重新挂载同一任务仍保持锁定。
- pi（本会话）在 `packages/ui` 执行同一单文件命令：最终
  **49/49 passed**，退出码 `0`，duration `7.57s`。
- 未新增真实浏览器场景，因此本轮未运行浏览器专项配置；证据仅为 jsdom 组件契约。

### 边界

- 本地 stub Provider 只证明调用次数和组件状态，不证明真实任务服务的重试/取消
  幂等、并发写入仲裁、权限、持久化恢复或最终任务状态。
- 未验收真实任务/通知 Provider、跨浏览器、读屏、发布包样式和发布。
- B3-08 仍不能因本组件契约关闭；真实服务边界需外部授权后验证。
