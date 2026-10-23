# Surface 默认组件与内置 SVAR 查询错误展示

## Follow-up Contract

- parent：`dashboard-query-feedback-20261021.md`；
  source：用户“继续”及本轮 Dashboard 16 资源故障注入；
  reason：独立 Surface 默认组件把 Provider 原始错误直接放进页面。
- 目标：默认 metric、bar-chart、line-chart、resource-table 使用现有本地化
  通用错误文案；错误不伪装成零或空态；现有 `refresh(sourceId)` 可原地恢复。
- 非目标：不改变协议、数据源、缓存、权限、错误对象及 `onError` 回调；
  不新增重试按钮或重试策略，不改样式或数据写入。
- 写入范围：上述四个 Widget、`SurfaceRenderer.test.svelte.ts`，
  Dashboard 相关行为断言和本证据、产品规范。
- 风险与编排：medium / managed；主线程单写入者，一名只读 verifier。
- 首轮状态：默认目录的本地实现、包内回归、消费者回归和独立复核完成。
  内置 SVAR 与权限语义的续接结果见下文；第三方 Widget 不在本批范围内。

## 验收

```gherkin
Given Provider 抛出包含诊断信息的错误
When 默认四种组件展示错误
Then 只显示对应的本地化不可用提示，不显示原始错误，不伪装成零或空态

Given 某数据源失败且其他数据源已成功
When 宿主调用现有 refresh(sourceId)
Then 只重新请求对应源，再失败仍显示通用错误，恢复后保留未受影响组件节点

Given 宿主配置 onError
When Provider 失败
Then 回调仍收到原来的错误代码和诊断信息，不因展示层脱敏丢失诊断

Given 宿主指定中文或覆盖安全提示
When 查询失败
Then 使用对应语言或宿主提示，而不是 Provider 原始文案
```

## 首轮验证（权限语义调整前）

- `bunx vitest run --config vitest.config.ts src/SurfaceRenderer.test.svelte.ts`：
  2026-10-21 11:02，12/12，退出 0。
- `bun run check`（`packages/surface`）：0 errors / 0 warnings。
- `bun run build`（`packages/surface`）：成功生成 `dist`，供示例消费者读取。
- `bun run --cwd example test -- test/pm-business-pages.test.ts -t Dashboard`：
  21/21，退出 0；其中 `products` / `sales_orders` 失败后通过
  `Refresh Surface` 重新请求两个独立数据源并清除 Surface 错误。
- 独立只读 verifier Hooke：未发现状态、i18n、公共契约或数据恢复回归；
  复核建议已补齐重试回调次数和恢复后的指标/图表正向断言。
- 默认 Surface 目录的错误对象仍完整传给 `onError`，页面只显示本地化
  通用文案；没有把诊断信息放进用户可见组件。
- 首轮仅覆盖默认目录，不将首轮结论外推为所有 Surface 目录均完成错误脱敏。

## 权限反馈收口（续接）

- parent：本页 Follow-up Contract；source：用户“继续”；
  reason：默认组件已隐藏诊断，但权限拒绝被归为服务不可用，
  SVAR Grid 的错误分支仍需同样的展示契约。
- 目标：默认四类组件及内置 `SvarGridWidget` 按错误码区分无权访问、
  服务不可用与数据无效，支持中英文和可信宿主覆盖。
- 非目标：不改变授权结果、请求范围、缓存隔离、重试入口和 `onError`
  的原有诊断契约；不覆盖任意第三方目录，不改样式。
- 写入范围：本地化 helper、上述五类 Widget、直接相关组件测试和本页、
  `ENTERPRISE_PRODUCT_SYSTEM.md`。
- 风险与编排：medium / managed；主线程单写入者，一名只读 verifier。
- 状态：本地实现及定向回归完成；未提交、推送、发布或部署。

```gherkin
Given 权限检查明确拒绝并附带内部诊断
When 默认组件或已配置引擎的内置 SVAR Grid 展示错误
Then 显示本地化无权访问提示，不请求数据，也不把诊断放入 DOM

Given 已展示成功数据或旧权限请求仍在等待
When 所属权限 Provider 被替换为拒绝访问
Then 清除旧数据，旧请求不能恢复数据，onError 保留原有权限错误

Given Provider 返回无效数据或绑定指针不存在
When 组件展示错误
Then 显示数据无效而不是服务不可用，不展示内部错误详情

Given 宿主指定语言或覆盖 accessDenied
When 出现权限拒绝
Then 使用指定安全文案且保持错误代码和回调诊断不变
```

## 收口结果（2026-10-21）

| 错误码 | 用户可见状态 | 诊断边界 |
| --- | --- | --- |
| `access_denied` | 无权访问 / Access denied | 权限拒绝原因仍通过原有 `onError` 返回，不进入 DOM |
| `access_check_failed` | 对应组件的数据不可用 | 保留核心既有 `Access control request failed` 归一化，不恢复私有授权异常 |
| `provider_failed` | 对应组件的数据不可用 | 查询 Provider 的原始诊断仍通过 `onError` 返回 |
| `provider_result_not_json` | 对应组件的数据无效 | 数据源契约诊断仍通过 `onError` 返回 |
| `binding_pointer_not_found` | 对应组件的数据无效 | 维持原有投影层行为，不新增 `onError` 事件 |

- `SurfaceMessages.accessDenied` 为可选扩展字段，保持旧宿主消息对象的类型兼容；
  `resolveSurfaceMessages()` 补齐中英文默认值，可信宿主可覆盖安全提示。
- 复核发现的必填字段兼容性问题已修正；中英文测试均含旧消息对象省略该字段的
  类型赋值及渲染断言，包级类型检查覆盖该用例。
- 独立只读 verifier Bohr 最终确认该兼容性问题已解决，错误码映射及新增测试
  范围内无明确 P0/P1/P2 风险；复核者未修改文件或重复执行测试。
- `SurfaceRenderer.test.svelte.ts`：19/19，退出 0。
  覆盖四种默认组件的权限拒绝、授权检查异常、无效返回、绑定缺失、
  Provider 失败、宿主文案覆盖，以及分源重试与恢复。
- `SurfaceRenderer.incremental.test.svelte.ts`：19/19，退出 0。
  保留撤权清除旧数据、重试范围、过期请求丢弃等原有行为断言。
- `SurfaceRenderer.scope.test.svelte.ts`：13/13，退出 0。
  拒绝访问不请求数据；作用域替换清除旧数据；过期权限结果不能恢复读取；
  原有拒绝原因只进入回调，不进入界面。
- `SvarGridWidget.test.svelte.ts`：16/16，退出 0。
  覆盖五类错误码、中英文、旧宿主消息兼容、宿主覆盖、错误切换、
  缺失引擎配置；使用类型化引擎替身，错误时断言引擎不挂载。
- `bun run check`（`packages/surface`）：0 errors / 0 warnings；
  `bun run build`：退出 0，已刷新本地 `dist`。
- `bun run --cwd example test -- test/pm-business-pages.test.ts -t Dashboard`：
  21/21，另外 124 项按范围跳过，退出 0；使用重建后的包验证示例消费者。
  此项为组件测试，不是本轮新增的真实浏览器验收。
- `git diff --check`：通过；未运行全量测试或 standalone 门禁。

### 验收边界

- 内置 `createSvarSurfaceCatalog()` 注册的 `SvarGridWidget` 已纳入错误展示契约；
  宿主缺少 Grid/Theme 时仍优先显示独立配置提示。
- 首轮只使用错误分支替身。下文续接已完成真实 Grid 的查询失败恢复、
  撤权及重新授权验收；分页和真实后端不由这些场景推导。
- 自定义第三方 Widget 仍自行负责错误展示与恢复契约，本轮不声明其均已完成脱敏。

## 真实 SVAR 浏览器续接

- parent：本页权限反馈收口；source：用户要求继续直到全部完成；
  reason：上一轮错误分支使用引擎替身，需要真实 Grid 的状态迁移证据。
- 目标：验证首次查询失败、再次失败、恢复、成功后撤权和重新授权；
  中英文提示变化不重新请求，原始诊断不进入 DOM。
- 非目标：不改组件 API、权限算法、生产 Provider、依赖或默认表格；
  不把受控网络响应当作真实业务后端验收。
- 写入范围：SVAR `Surface.svelte` fixture、`surface.spec.ts` 直接相关场景、
  本页和父级 Dashboard 证据、`ui-state-matrix.md`。复用现有浏览器配置，
  本轮不改并行的资源表格读取场景。
- 编排：medium / managed，主线程单写入、一名只读 verifier。
- 状态：基线 4/4 通过；加入两个真实引擎状态迁移场景后 6/6 通过。

```gherkin
Given 真实 Grid 的数据源查询失败
When 宿主再次刷新仍失败，之后响应恢复
Then 错误只在组件内展示，再失败不显示诊断，恢复后重新挂载真实 Grid

Given 查询仍在等待
When 用户尝试重复刷新
Then 宿主刷新入口禁用，只有一个对应源请求，完成后入口恢复

Given 已加载记录且宿主撤销读取权限
When 旧请求晚到或用户刷新
Then 旧记录和 Grid 不再显示，不继续请求数据，重新授权后才恢复

Given 错误态已经确定
When 宿主切换语言或仅修改标题
Then 提示更新而数据源不重新请求
```

### 当前验证

- `bun run vite build --config scripts/fixtures/svar-grid/vite.config.ts`：
  成功；保留已有大于 500 kB chunk 的体积提示，不把它当作性能验收。
- 在 `scripts/fixtures/svar-grid` 执行：

  ```sh
  PLAYWRIGHT_JSON_OUTPUT_FILE=../../../output/playwright/surface-query-feedback-20261021/report.json \
    node ../../../node_modules/@playwright/test/cli.js test \
    --config playwright.config.ts surface.spec.ts \
    --output ../../../output/playwright/surface-query-feedback-20261021/results \
    --reporter=line,json
  ```

  结果：Chromium 6/6，退出 0，无跳过、无重试。使用仓库 Vite 开发服务，
  不是生产 preview；构建与浏览器验收分别记录。
- `bun x --no-install svelte-check --tsgo-experimental-api
  --tsconfig scripts/fixtures/svar-grid/tsconfig.json --threshold error`：
  0 errors / 0 warnings。初次发现测试 `HTMLElement | SVGElement` 的
  `click()` 类型问题，已用原生按钮类型检查修正，无类型忽略。
- 新增状态迁移确认：两次失败只显示一个通用错误，第三次请求恢复真实 Grid；
  等待期间刷新入口禁用；语言和标题变更不查询；
  撤权后无 Grid、无旧记录，迟到响应处理完成后仍不恢复旧数据；
  拒绝期间点击刷新不会请求数据，重新授权只产生一次新读取。
- 新增两项测试均检查 `pageerror` 为空，并确认右侧固定列恢复。
  现有正常态继续检查 1440、1920、390 宽度无文档横向溢出。
- 独立只读 verifier Bohr 未发现阻塞问题，确认迟到响应测试等待了
  `route.fulfill` 与原始 `refresh()` Promise 完成后才检查旧数据缺失。
  禁用按钮用例只证明宿主入口防重复点击，不证明 `refresh()` API 自身并发去重。
- 产物位于 `output/playwright/surface-query-feedback-20261021/`。
  最新 7 张截图中实际查看了 Provider 错误、中文无权访问、恢复后三张；
  错误提示未暴露内部诊断，恢复后真实 Grid 和固定列可见，没有明显遮挡。
  测试计数/错误码输出只保留在 hidden 节点，不污染视觉证据。
- 测试服务由 Playwright 启动并在执行后退出。没有连接真实后端、修改权限算法、
  发布依赖、提交或部署；没有重新执行其他 Grid 文件或全量测试。
