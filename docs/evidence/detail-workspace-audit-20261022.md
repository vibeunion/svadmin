# B3-05 详情工作台核对与实施证据（2026-10-22）

## B3-05 follow-up contract：Provider 同步响应式读取回归（本轮审查修正）

- 目标：验证 `DetailWorkspaceAsyncSection` 在同步执行栈内调用外部 `provider.load` 时，provider 合法读取并增加响应式状态不会意外成为 effect 依赖而重复请求；先取得真实红测，再做最小生产修复。
- 唯一 writer：pi；本轮未 commit、未 push、未 deploy。只运行 `detail-workspace.test.svelte.ts` 单文件与 `git diff --check`，未运行其他测试、构建、类型检查或浏览器矩阵。
- 修改范围：`packages/ui/src/components/detail-workspace.test.svelte.ts`、新增最小 `packages/ui/src/components/detail-workspace-reactive-provider.test-host.svelte`、`packages/ui/src/components/DetailWorkspaceAsyncSection.svelte`、本证据文档与浏览器证据文档。未修改已有浏览器 spec/fixture/配置；既有脏改动保留。
- 回归设计：测试 host 的 provider 在同步调用栈内读取并增加一个 `$state` 计数，并设置请求上限，避免红测真正无限循环。用例断言首次挂载只调用 provider 1 次，点击 Retry 只再调用 1 次（总计 2 次）。
- 红测（生产未修改）：同一单文件 `1 failed | 8 passed`，原始退出码 `1`；配置上限 3 时首次挂载实际调用 4 次（3 次响应式写入触发重跑 + 1 次达到上限后的收尾调用），期望 1 次。失败点位于首次挂载调用次数断言，不是 fixture 或观测代码自触发。
- 最小修复：仅在 `DetailWorkspaceAsyncSection.svelte` 的 effect 内用 Svelte `untrack` 包裹 `currentProvider.load(...)` 的同步调用边界。`resourceName`、`recordId`、provider meta、tenant、auth session、accessControlProvider、auditLogProvider、data provider 与 `retryVersion` 仍在 `untrack` 外侧读取和捕获，作用域与重试依赖没有被移出 effect。
- 绿测（同一单文件、同一命令）：`9 passed`，原始退出码 `0`，duration `8.21s`；首次挂载 1 次，Retry 后 2 次，响应式读取计数同步为 1 和 2。文档更新后 pi 再次独立运行同一单文件：`9 passed`，原始退出码 `0`，duration `15.64s`；主线程随后独立复跑同一单文件：`9/9 passed`、原始退出码 `0`、duration `17.16s`。各次绿测分别独立记录，不合并计数。`git diff --check` 退出码 `0`（主线程亦确认）。
- 结论纠正：此前浏览器 fixture 使用 `window.__detailWorkspaceCalls` 只是隔离观测，不能据此把循环只归咎于 fixture，也不能证明生产组件健壮。本次红测确认生产 effect 存在真实重复请求缺口，修复边界限定为外部 provider 同步调用，不改变 section 的作用域、授权、租户、provider 或重试语义。
- 边界：该回归是本地组件级受控 host 证据，不证明真实浏览器行为、真实后端 provider、服务端授权/租户隔离或发布包。修复后主线程已独立复跑浏览器全矩阵（`24/24`、exit `0`、`38.2s`，与 pi 自测 `24/24`、exit `0`、`43.8s` 分开记录、不合并），并抽查 `webkit-narrow-attachments-failed.png` 确认两个模式按钮不裁切；四个新增浏览器文件与证据文档空白检查无问题；但仍不据此宣称真实服务/RBAC、详情 A→B 五区浏览器联动、读屏、发布或部署完成。

## B3-05 follow-up contract：扩展区生命周期（本轮续补）

- 目标：解决真实 `BoundRecordDetailDrawer` 在 A/B 两条记录均已缓存成功时，切换 `recordId` 后 `extraSections` 仍复用旧子组件、保留旧局部状态的生命周期缺口。
- 唯一 writer：pi；风险级别：managed 中风险；主线程为唯一独立 verifier。本轮 pi 只做 writer 自测，不把主线程复核写成已完成，也不把自测冒充独立验收。
- 允许修改范围：`packages/ui/src/components/BoundRecordDetailDrawer.svelte`、`packages/ui/src/components/detail-contract.test.svelte.ts`、必要的测试扩展探针/host、本证据文档与验收矩阵 B3-05。未修改 API、布局、颜色，未引入新 provider/框架，未做 Figma 或视觉改版。
- 非目标：不证明活动、附件、关联、版本差异已成完品闭环；不证明真实后端、真实 RBAC、真实浏览器/读屏、发布包或部署。
- 既有改动保留：`detail-contract.test-host.svelte` 原有 `notificationProvider` 脏改动保留，本轮只在其上追加可选 `showExtension` 测试探针开关，未让 host 自己给扩展区加 key。
- 新增测试探针：`detail-contract.test-extension.svelte` 与 `detail-contract.test-extension-state.ts` 仅用于验证扩展子组件的挂载/销毁与局部状态，不虚构真实后端数据。

### Gherkin

```gherkin
Feature: BoundRecordDetailDrawer extension lifecycle follows the selected record

  Scenario: cached record A switches to cached record B
    Given records A and B have both been fetched successfully into the same query cache
    And record A's extension has an in-progress local operation
    When the drawer record ID changes from A to B without a loading unmount
    Then record A's extension is destroyed
    And record B's extension is mounted fresh
    And record B's extension starts with idle local state

  Scenario: parent record read permission is denied
    Given the parent record is not authorized for reading
    Then the extension is not mounted
    When an authorized record with an active extension loses read permission
    Then the extension is unmounted and its local state is discarded
```

### 红测（生产未修改）

- 命令（工作目录 `packages/ui`）：`bunx vitest run --config ./vitest.config.ts src/components/detail-contract.test.svelte.ts`
- 结果：`1 failed | 45 passed`，文件 `1 failed`；原始退出码 `1`；duration `16.17s`。
- 失败断言：`detail-contract.test.svelte.ts:176`，切换 A→B 后扩展探针期望 `idle`，实际为 `active`。即 B 已正常显示 `Record 2`，但 A 的扩展子组件未被销毁，A 的局部操作状态被复用。
- 该红测发生在生产代码未修改时，证明真实 `RecordDetailDrawer`/`BoundRecordDetailDrawer` 消费者路径存在扩展生命周期缺口，而不是 host 自加 key 的假象。

### 绿测（最小生产修复后）

- 生产修复：仅在 `BoundRecordDetailDrawer.svelte` 的 `extraSections` 外层补与字段区相同的 `{#key \`${resourceName}:${recordId}\`}`，未改扩展 snippet API、布局或颜色。
- 同一命令、同一单文件结果：`46 passed`，文件 `1 passed`；原始退出码 `0`；duration `14.12s`；执行主体为 pi 自测。
- 新用例精确断言：A 的扩展先处于 `active`，仅切换 `recordId` 到已缓存的 B 后，生命周期记录为 `mount A → destroy A → mount B`，B 的局部状态为 `idle`；父记录授权拒绝时扩展不挂载，授权后撤销时扩展销毁且局部状态丢弃。
- 主线程独立复核：同一单文件 **46/46 passed**，原始 exit code `0`，duration `9.69s`。与 pi 自测 46/46、14.12s 分开记录，不合并计数。运行出现依赖 `svelte2tsx/index.js.map` 缺失警告，未导致测试失败；不据此宣称全仓构建或类型检查通过。

### 边界

本续补只保障 `extraSections` 扩展组件随 `resourceName:recordId` 的生命周期重建，不证明活动、附件、关联、版本差异的内容正确性、权限、真实数据源或工作台整体闭环。扩展点重建不等于这些业务区已验收。

## B3-05 follow-up contract：AutoTable 真实详情工作台消费者（本轮实施）

- 目标：在真实 `AutoTable` 详情抽屉路径接入五区详情工作台，并优先实现可消费的扩展接口，而不是静态占位内容。
- 唯一 writer：pi；本轮未提交、推送、部署，也未运行全仓 test/build/typecheck。
- 允许修改范围：`AutoTable.svelte`、新增内部 `DetailWorkspaceSections.svelte` / `DetailWorkspaceAsyncSection.svelte` / `detail-workspace.ts`、`AutoTableInteractionsHarness.svelte`、新增 `detail-workspace.test.svelte.ts`、`packages/ui/src/index.ts` 类型导出、`packages/core/src/i18n.svelte.ts` 详情工作台文案、本证据文档与 B3-05 验收矩阵。既有脏改动全部保留。
- 真实接口：`AutoTable` 新增可选 `detailWorkspace` prop，并仅在提供时向真实 `RecordDetailDrawer → BoundRecordDetailDrawer.extraSections` 传入详情工作台；未提供时不改变既有抽屉行为。
- 五区组合：
  - 关联：没有 core provider 契约，采用可选 `relations` snippet provider，接收 `{ resourceName, recordId }`。
  - 附件：没有 core provider 契约，采用可选 provider/snippet；provider 默认由真实 `FileList` 渲染，snippet 由消费方显式提供。
  - 活动：没有 core provider 契约，采用可选 provider/snippet；provider 默认由真实 `AuditTimeline` 渲染。
  - 审计：默认使用现有 `adminContext.auditLogProvider`，通过 `withValidatedAuditProvider(...).get({ resource, meta: getProviderMeta(resource, { recordId }) })` 读取；也可显式覆盖为 provider/snippet。
  - 版本差异：没有 core provider 契约，采用可选 provider/snippet；provider 返回 `oldValue/newValue` 后由真实 `VersionDiffViewer` 渲染。
- 作用域与 fail-closed：五区统一位于 `{#key \`${resourceName}:${recordId}\`}` 内；异步区在销毁或作用域变化时 abort，并丢弃非当前请求结果；缺少配置显示 `data-svadmin-detail-section-unavailable`，provider 失败显示 `data-svadmin-detail-section-error`，不渲染旧数据或伪造网络数据。

### 红测（生产消费者未接入）

- 先新增 `packages/ui/src/components/detail-workspace.test.svelte.ts`，通过真实 `AutoTableInteractionsHarness` 挂载真实 `AutoTable`/详情抽屉；harness 仅新增 `detailWorkspace`、可选 `auditProvider` 与关联探针，不自行伪造工作台区。
- 在 `AutoTable` 尚未接入 `detailWorkspace` 时运行：
  `bunx vitest run --config ./vitest.config.ts src/components/detail-workspace.test.svelte.ts`
- 结果：`2 failed`，原始退出码非 0，duration `14.80s`。失败表现为五区内容不存在，证明测试捕获的是真实消费者缺口，不是静态组件自测。

### 绿测（最小真实消费者接入后）

- 同一单文件、同一命令：`2 passed`，原始退出码 `0`，duration `14.45s`（pi 自测）。
- 用例覆盖：
  1. 预先缓存 B 记录，再打开 A 详情，断言关联探针、附件、活动、审计、版本差异五区均显示 A 数据；关联探针先进入局部 `active` 状态，随后切换到已缓存的 B，断言 A 的附件/活动/审计/版本内容消失、B 内容出现，且关联探针重建为 `idle`。provider 精确收到 `{ resourceName: 'users', recordId: 'user-1' }` 与 B 对应 scope，切换后不再出现 A 请求；审计 provider 精确收到 `resource` 与 `recordId` meta。
  2. 无附件/活动/审计/版本配置时四区显示 unavailable；附件 provider 对 B 拒绝后显示错误态，A 的附件不残留，原始错误文本不泄露。
- 回归（直接相关既有单文件，分别独立运行）：
  - `detail-contract.test.svelte.ts`：`46 passed`，原始退出码 `0`，duration `21.88s`。
  - `auto-table-interactions.test.svelte.ts`：`48 passed`，原始退出码 `0`，duration `27.58s`。
- `git diff --check`：原始退出码 `0`。
- 本轮未新增或运行 Playwright；没有新的浏览器/读屏直接证据。

### 仍未验收边界

- 本轮证明的是真实 `AutoTable` 消费者路径的五区挂载、资源/记录作用域、A→B 重建、缺失配置 fail-closed 与 provider 拒绝失败关闭；不证明真实业务附件/关联/版本历史/活动服务，也不证明真实审计服务、RBAC、字段/租户授权或服务端持久化。
- 组件级 provider 仅是可消费扩展接口；消费方仍必须提供真实业务实现。当前没有把 `RelationPicker`、`FileList`、`AuditTimeline`、`VersionDiffViewer` 的独立组件测试外推为工作台业务闭环。
- 未运行全仓 test/build/typecheck；未验证发布包、消费者生产构建、真实浏览器/读屏、版本冲突/空态业务语义和部署。

## 本轮审查修正（B3-05 初版复审）

- 目标：修正初版 `DetailWorkspaceSections`/`DetailWorkspaceAsyncSection` 的实例 ID、同记录作用域清空边界与默认审计读取的父记录授权门，并把测试从两条同步 resolve 扩展为真实 `AutoTable` 消费者下的迟到结果、显式重试和父记录授权撤销断言。
- 修改范围：仅 `DetailWorkspaceSections.svelte`、`DetailWorkspaceAsyncSection.svelte`、`detail-workspace.ts`、`AutoTableInteractionsHarness.svelte`、`detail-workspace.test.svelte.ts`、必要的 `detail-workspace-scope.test-host.svelte` 与本证据文档；既有 `AutoTable` 接入和仓库其他脏改动保留。未改布局、颜色或新增设计 token；未运行其他测试或全仓检查。
- 问题 1（实例 ID）：五区 `<h3>` 与 `aria-labelledby` 改用 `$props.id()` 的实例前缀 `${instanceId}-detail-workspace-*`。新增两个真实 `AutoTable` 详情工作台实例同时挂载的断言，最终 10 个标题 ID 全部唯一。临时把实例前缀固定为常量时红测：`1 failed | 7 passed`、exit `1`、duration `12.27s`，唯一 ID 数从 10 降为 5；恢复 `$props.id()` 后绿。
- 问题 2（同记录作用域）：`DetailWorkspaceAsyncSection` 现在在 effect 内捕获 `getProviderMeta`、tenant、auth session、`accessControlProvider`、`auditLogProvider` 与当前 data provider，并把 `meta` 传给 provider scope；作用域变化时 effect 清理并 abort，迟到结果同时用捕获值复核，旧请求不能写回。新增真实 `AutoTable` tenant 切换断言和隔离 host 断言，均断言旧 tenant 请求晚到时不可见、新 tenant 请求成功后才显示。该隔离用例在临时移除依赖读取后仍为绿，说明当前测试 host 的 rerender 路径会重建组件、不能单独充当子组件缺口的红测；因此这里只把租户边界作为当前实现的行为绿测，不把它冒充为已验证的红绿对照。未自造字符串凭证 key。
- 问题 3（测试强度）：只保留真实 `AutoTableInteractionsHarness → AutoTable → 详情抽屉` 消费者路径，并新增：B 仍 pending 时 A 附件迟到成功、A 版本迟到失败均不渲染，B resolve 后才显示；失败后显式“重试”只增加一次请求并恢复；父记录读取初始拒绝时所有分区不挂载且 provider 不调用，授权后撤销时扩展区卸载且不再新增分区读取。仍使用受控 provider/host，不宣称真实后端。
- 问题 4（样式）：本轮 `.id()` 与默认渲染未新增布局或视觉样式，未扩大布局，仍沿用既有组件与语义 token。
- 问题 5（授权约定纠正）：项目没有既有 `audit/read` 动作，不能把猜测的 `audit/read` 当成产品授权规范。默认审计读取现只复用既有的父记录读取契约 `useCan({ resource: resourceName, action: 'show', id: recordId })`，未授权时显示 `data-svadmin-detail-section-denied` 且不调用 `AuditLogProvider.get`；未硬编码虚构的 `audit` 资源。独立审计授权仍由宿主/后端控制，本轮只验证详情工作台不绕过父记录读取门，不声称独立审计 RBAC 已完成。默认审计 provider 保持稳定对象身份，避免父记录权限查询刷新重复拉取。测试中专门 `audit/read` 的断言已删除，因为父记录授权用例已覆盖该门禁，并在该用例中补充默认审计 provider 在拒绝和撤销后不被调用的真实 `show` 检查；测试宿主 `auditReadAllowed` 模拟分支同步撤除，不影响其他用例。
- 最终绿测（`packages/ui`，仅该单文件）：`bunx vitest run --config ./vitest.config.ts src/components/detail-workspace.test.svelte.ts` → `8 passed`、exit `0`、duration `11.13s`（pi 自测）；主线程随后独立复核同一单文件，`8 passed`、exit `0`、duration `10.83s`，两次为独立运行，分开记录、不合并。另执行 `git diff --check` 并保持 exit `0`。此前含专门 `audit/read` 用例的 `9 passed`、exit `0`、duration `11.11s` 与接入初期 `2 passed` 均仅作为历史计数保留，不与当前 `8/8` 合并。
- 最终审计权限与验收边界：最终审计权限是父记录 `show`，项目不存在既有 `audit/read` 规范，不得把猜测动作当作产品授权规范；独立审计 RBAC、真实 Provider、浏览器/读屏、发布仍未验收。
- 证据边界：上述均为本地受控 provider/host 的消费者级测试。A/B pending 隔离、重试与父记录读取授权撤销已覆盖；同记录 tenant 隔离有行为绿测但缺少可区分红测；dataProvider/auth/accessControl 同记录切换只由实现与作用域读取覆盖，未逐项单独断言。未验证真实审计/详情服务、独立审计 RBAC、租户/字段授权、浏览器/读屏、发布包或部署；不得把可选 snippet/provider 探针说成真实关联业务完成。

## B3-05 follow-up contract：A→B→A 关闭生命周期最终证据（2026-10-22）

- 目标：验证同一详情抽屉内 A→B→A 返回原记录后，Escape 关闭不会因历史顶部仍为 B 而回到 B。范围仅 `packages/ui/src/components/AutoTable.svelte` 的详情关闭生命周期、`scripts/fixtures/enterprise-ui/detail-workspace.spec.ts` 的必要断言与类型，以及本证据文档和 B3-05 验收矩阵；未改其他生产组件、API、布局、颜色或 router 契约。pi 为唯一 writer，未 commit、未 push、未 deploy。
- 红绿（单 project 定位）：生产未修改时 `--project=chromium-desktop -g "without returning to B"` → `1 failed`、原始退出码 `1`、duration `12.4s`，`detail-workspace-route-detail` 实际仍为 `~svadmin-id:["number",2]`；最小修复后同一命令 → `1 passed`、原始退出码 `0`、duration `2.6s`。`--project=chromium-desktop` 全组 → `6/6 passed`、原始退出码 `0`、duration `8.2s`。
- 最终全矩阵：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.detail-workspace.config.ts` → **pi 自测 36/36 passed**（6 场景 × Chromium/WebKit/Firefox × desktop/narrow）、原始退出码 `0`、Playwright duration 约 `1.0m`；**主线程独立复跑同一配置** → **36/36 passed**、原始退出码 `0`、Playwright duration 约 `1.0m`。两次为独立运行，分开记录、不合并。
- 历史关系：修复前共享主线程的 `30/30`（A→B 场景版本）仅作修正前历史保留，不与本次 A→B→A `36/36` 合并；此前 `24/24` 与 `30/30` 亦分别独立记录。
- `git diff --check`：原始退出码 `0`（pi 与主线程均确认）。
- 边界：该证据使用受控 `RouterProvider`、受控内存 section provider 与受控 `AccessControlProvider`，证明真实浏览器与真实 `AutoTable` 消费路径下的 A→B→A 关闭生命周期；不证明真实后端、真实 RBAC、租户/字段授权、真实服务端延迟/取消、跨页面历史恢复、读屏、发布包或部署。真实服务、独立审计 RBAC、版本历史/附件/关联服务、真实浏览器以外的读屏与发布仍未验收。


- 目标：只读判断 B3-05“关联、附件、活动、审计、版本差异”的现有直接证据与缺口，重点核对对象切换后旧审计/旧详情是否残留。
- 两轮唯一 writer 均为 pi；主线程独立审查并在补强轮独立复跑同一命令。第一轮未修改生产代码和测试；补强轮只修改测试宿主和测试文件。未提交、推送、部署。
- 环境：本地仓库与本地受控 Provider/测试宿主；没有连接真实审计/详情服务，没有执行真实浏览器或读屏验收，没有发布动作。
- 第一轮只运行一个最窄直接相关测试文件：`audit-log-viewer-scope.test.svelte.ts`；后续最小缺口补强轮只运行 `scoped-async-consumers.test.svelte.ts`。两轮运行独立记录，不合并计数；补强轮的 pi 自测与主线程独立复核也分别独立记录。
- 未运行其他测试文件；它们的既有结果只在本文中标注为“仓库现有测试断言/历史证据”，不并入本轮或第一轮运行结果。

## 第一轮实际运行（历史记录，保持独立）

在 `packages/ui` 执行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/audit-log-viewer-scope.test.svelte.ts
```

- 结果：`1 passed` 文件，`2 passed` 用例。
- 原始退出码：`0`。
- Vitest duration：`5.88s`。
- 执行主体：**pi 自测**，独立记录，不等同于主线程复跑。
- 该文件实际断言：
  1. `authProvider` 与 tenant 同时从 A 切到 B 后，列表显示 B，先前打开的 A 审计快照（`scope-a-secret`）消失。
  2. 仅分页变化时，已打开的同一作用域审计快照保留，并确认按第 2 页请求。

### 主线程独立复核

- 主线程已独立运行同一命令：`bunx vitest run --config ./vitest.config.ts src/components/audit-log-viewer-scope.test.svelte.ts`。
- 结果：**2/2 passed**，原始 exit code `0`，duration `6.94s`。
- 该结果为主线程独立记录，与上方 pi 自测（2/2、exit 0、5.88s）分别独立，不合并为一次运行，也不互相替代。

边界：本次运行证明的是 `AuditLogViewer` 审计快照在 **authProvider 与 tenant 从 A 切到 B** 时关闭，并且**仅在分页变化时保留**同一作用域审计快照；**没有**证明详情记录对象 A→B 切换时旧审计不残留，不是记录 ID A→B 的验证。

## 本轮实际运行（B3-05 最小缺口补强）

为补上“记录 ID A→B 时旧 `AuditLogDrawer` 不残留”的直接行为证据，仅修改测试宿主和测试文件，并只运行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/scoped-async-consumers.test.svelte.ts
```

### 旧版结果（修正前版本，保留，不覆盖）

- 结果：`1 passed` 文件，`10 passed` 用例。
- 原始退出码：`0`。
- Vitest duration：`15.97s`。
- 执行主体：**pi 自测**，独立记录；历史 `audit-log-viewer-scope` 的 2/2 不并入本轮计数。
- 该 10/10 为**审查修正前**的结果，保留但不代表当前测试文件版本；修正后的新版 11/11 见下文。
- 宿主变化：`scoped-async-consumers.test-host.svelte` 新增可选 `recordId` prop，默认值保持 `shared-record`，并显式传给 `AuditLogDrawer`；未修改生产组件。
- 新增直接用例：同一 provider、同一 tenant/resource，仅把 `recordId` 从 `record-a` 切到 `record-b`。B 的审计请求先返回并显示 `record-b-auditor`；A 的迟到响应随后返回，仍不显示 `record-a-auditor`。
- 精确断言：第一次请求 meta 为 `{ recordId: 'record-a', tenantId: 'tenant-current' }`，第二次为 `{ recordId: 'record-b', tenantId: 'tenant-current' }`，最终 `get` 总调用次数为 2。

#### 旧版主线程独立复核（修正前版本，与旧版 pi 自测分开记录）

- 主线程独立运行同一命令：`bunx vitest run --config ./vitest.config.ts src/components/scoped-async-consumers.test.svelte.ts`。
- 结果：**10/10 passed**，原始 exit code `0`，duration `9.16s`。
- 主线程另确认 `git diff --check` exit code `0`。
- 该结果为主线程独立记录，与上方 pi 自测（10/10、exit 0、15.97s）分别独立，不合并为一次运行，也不互相替代；同为**修正前版本**结果，保留但不代表当前测试文件版本。
- 历史 `audit-log-viewer-scope` 的 pi 2/2、主线程 2/2 仍是另一组独立证据，仍单独保留，不与本次 `scoped-async-consumers` 的任一记录合并。

### 本次审查修正后的新版结果（旧版 10/10 保留，不并入）

- 修正原因：旧版记录 ID A→B 单用例中 A 请求从未先 resolve，只能证明 A 的迟到响应不覆盖 B，不能证明“A 日志已显示后，切换 recordId 时立即清空”。
- 修改范围：仅 `packages/ui/src/components/scoped-async-consumers.test.svelte.ts` 与 B3-05 文档；未修改生产代码。
- 用例调整：保留原迟到响应隔离用例；新增同一 provider、同一 tenant/resource 下先 resolve A 并断言 `record-a-auditor` 显示，再仅把 `recordId` 从 `record-a` 改为 `record-b`，立即断言 A 日志不再显示且 B 请求已发出，随后 resolve B 并显示 `record-b-auditor`。两个用例各自精确断言 A/B 请求 meta，最终 `get` 调用次数均为 2。
- 本次只运行：`bunx vitest run --config ./vitest.config.ts src/components/scoped-async-consumers.test.svelte.ts`。
- 结果：`1 passed` 文件，`11 passed` 用例；原始退出码 `0`；执行主体为 **pi 自测**。本次 pi 运行未提供 duration，故不记录 duration。
- 主线程独立复核：主线程独立运行同一命令，结果 **11/11 passed**、原始 exit code `0`、duration `9.36s`；另确认 `git diff --check` exit code `0`。
- 新旧结果关系：新版 11/11（pi 自测与主线程独立复核）不与旧版 10/10（修正前，pi 与主线程）或历史 `audit-log-viewer-scope` 的 2/2 合并。

边界：该用例只证明同一详情工作台内记录 ID A→B 切换时旧审计迟到响应不残留，以及两次请求分别携带 A/B 的 `recordId`；不证明新 provider 与 recordId 同时切换、旧活动/附件/关联/版本差异联动、真实审计服务或 RBAC。

## 按原始要求核对

| 原始要求 | 已有直接证据 | 缺口 |
| --- | --- | --- |
| 关联 | `FieldRenderer.svelte` 有 `relation` 字段渲染；`RelationPicker.svelte` 及 `relation-picker.test.svelte.ts` 覆盖关系选择/分页请求隔离 | 未定位“详情工作台关联记录区”的消费者与测试；未证明关联读取权限、对象切换后的关联残留、真实关联服务 |
| 附件 | `ApprovalCenter.svelte` 有审批附件列表；`content/FileList`、`FileUpload` 有独立组件证据 | 未定位详情工作台附件区消费者；审批附件/上传组件不能冒充详情工作台附件闭环；附件权限与对象切换未证明 |
| 活动 | `content/AuditTimeline.svelte` 与 `audit-timeline.test.svelte.ts`（历史 17/17）覆盖默认文案、状态和隐藏旧事件；`BoundRecordDetailDrawer` 支持 `extraSections` 且仅在记录读取成功后渲染 | 未定位详情工作台实际挂载活动时间线并随对象切换的消费者测试；活动数据源和权限未证明 |
| 审计 | 第一轮 `audit-log-viewer-scope` 历史结果：pi 自测 2/2、exit 0、5.88s，主线程独立复核 2/2、exit 0、6.94s（两次独立记录，不合并）；覆盖 authProvider+tenant A→B 切换关闭快照与仅分页变化保留快照。本轮补强 `scoped-async-consumers` 旧版（修正前，保留）：pi 自测 10/10、exit 0、15.97s；旧版主线程独立复核 10/10、exit 0、9.16s，并确认 `git diff --check` exit 0（两次独立记录，不合并）。审查修正后新版：A 先 resolve 并显示，再仅切换 recordId 到 B，立即断言 A 日志清空且 B 请求已发；B resolve 后显示 B。保留迟到 A 不覆盖用例。两份用例均精确断言 A/B 两次请求 meta 与调用次数为 2。新版 pi 自测 11/11、exit 0（pi 未提供 duration，不记录）；主线程独立复核 11/11、exit 0、duration 9.36s，并确认 `git diff --check` exit 0。`AuditLogDrawer` 源码按 `resource`/`recordId`/provider/tenant 清空并做请求代际隔离 | 历史 `audit-log-viewer-scope` 2/2 **不是**记录 ID A→B 验证，且不并入旧版 10/10 或新版 11/11；本轮只补同一 provider 的 recordId A→B，未证明新 provider 与 recordId 同时切换、旧审计侧栏与详情主体同步切换；真实审计服务/RBAC 未证明 |
| 版本差异 | `VersionDiffViewer.svelte` 存在，只接收 `oldValue`/`newValue` 等静态值；`version-diff-viewer.test.svelte.ts` 现有单测覆盖旧/新字段值的基本渲染。本轮只读审计并仅运行该单文件：pi 自测 1/1、exit 0、14.78s；主线程独立复核 1/1、exit 0、15.91s（两次独立、不合并） | 组件本身没有 loading/error/permission props，也没有空态文案（两侧都为空时仅显示 `0 changes`）；未定位版本差异挂载到详情工作台的消费者，未覆盖版本读取权限、错误态、空态、对象切换与真实版本服务 |

## 对象切换后旧审计/旧详情残留

### 旧详情

- `detail-contract.test.svelte.ts` 现有断言（本轮未运行）对 `page` 与 `drawer` 分别覆盖：`id` 变化后显示新记录，旧记录的迟到响应不进入当前视图；关闭抽屉后重开另一记录也不会显示旧响应。
- `BoundRecordDetailDrawer.svelte` 使用 `{#key \`${resourceName}:${recordId}\`}` 重建字段区域，并在 `recordId`/`resourceName` 变化时重置复制状态。
- 结论：旧详情不残留有直接源码与现有测试断言支持，但这不是本轮测试结果，也不是与审计侧栏联动的证明。

### 旧审计

- `AuditLogViewer`：第一轮直接证明 authProvider+tenant 切换会关闭已打开快照，仅分页变化保留快照（pi 2/2、5.88s；主线程独立复核 2/2、6.94s，两次独立记录）。
- `AuditLogDrawer`：源码 effect 依赖 `auditLogProvider`、`resource`、`recordId`、`open`、tenant/provider meta，变化时先 `clearAuditScope()`，并用 `requestEpoch` 丢弃迟到响应。
- 历史 `scoped-async-consumers.test.svelte.ts` 断言只把 provider、tenant、resource 一起切换，`recordId` 始终为 `shared-record`；补强保留该历史用例，并新增同一 provider、同一 tenant/resource 下仅切换 `recordId` A→B 的直接用例。
- 旧版（修正前，保留）补强用例证明：B 请求先返回时显示 B 日志，A 的迟到响应不进入当前视图；第一次请求 meta 为 `recordId: 'record-a'`，第二次为 `recordId: 'record-b'`，最终调用次数为 2。旧版 pi 10/10、15.97s；旧版主线程独立复核 10/10、9.16s，另确认 `git diff --check` exit 0。
- 审查修正后的新版用例补充证明：A 请求先 resolve 并显示 `record-a-auditor`，随后仅 `recordId` 改为 B 时，A 日志立即不再显示且 B 请求已发出；B resolve 后显示 `record-b-auditor`。迟到 A 不覆盖用例继续保留，两个用例的 A/B meta 与调用次数均精确为 2。新版 pi 自测 11/11、exit 0（pi 未提供 duration，不记录）；主线程独立复核 11/11、exit 0、9.36s，并确认 `git diff --check` exit 0。旧版 10/10（修正前）与历史 2/2 均单独保留、不并入新版。
- 结论：**记录对象 A→B 切换后旧审计不残留已有旧版（修正前）两次直接证据支持，并新增新版对“A 已显示后仅切 recordId 即清空”的 pi 11/11 与主线程独立复核 11/11 直接覆盖**（旧版：pi 10/10、15.97s 与主线程独立复核 10/10、9.16s，均 exit 0；新版：pi 11/11、exit 0（未提供 duration）、主线程 11/11、exit 0、9.36s）。各次为独立记录，不合并。该证据不外推为新 provider 与 recordId 同时切换、完整详情工作台联动或真实审计服务；历史 `audit-log-viewer-scope` 的 pi 2/2、主线程 2/2 仍是独立的 authProvider+tenant 作用域证据，单独保留。

### 版本差异审计（本轮只读，不新增测试）

- 源码：`VersionDiffViewer.svelte` 仅接收 `oldValue`、`newValue`、标题、`viewMode`、`fieldLabels`、`class`；`diffList` 完全由这两个对象派生，没有异步查询、错误、权限或对象作用域状态。
- 空态：两侧对象都为空时 `diffList` 为空，页面只显示 `Record Comparison` 与 `0 changes`，没有独立空态提示；未证明详情工作台在“无版本/无变更”时给出明确反馈。
- 错误/权限：组件没有 loading、error、permission 输入或拒绝态分支；现有单测也不覆盖这些状态。
- 对象切换：组件是受控值展示，旧/新值切换是否清空完全取决于外部消费者；当前未定位该消费者，因此不能据组件存在推断 A→B 对象切换行为。
- 消费者：在仓库内未发现 `VersionDiffViewer` 被详情工作台（含 `BoundRecordDetailDrawer.extraSections`）挂载的证据；现有用例只是直接渲染组件。
- 本轮实际运行（唯一命令，`packages/ui`）：

```bash
bunx vitest run --config ./vitest.config.ts src/components/version-diff-viewer.test.svelte.ts
```

- 结果：`1 passed` 文件，`1 passed` 用例；原始退出码 `0`；Vitest duration `14.78s`；执行主体为 **pi 自测**。
- 主线程独立复核：主线程独立运行同一命令，结果 **1/1 passed**、原始 exit code `0`、duration `15.91s`。该结果与 pi 自测（1/1、exit 0、14.78s）为两次独立运行，不合并。
- 单文件断言边界：只验证 `Old Title`/`New Title`/新增字段 `Tech` 的静态文本渲染；不验证空态、错误态、权限拒绝、对象切换、版本历史服务或工作台消费者。
- 结论：版本差异目前只有组件级静态渲染直接证据，空态/错误/权限/对象切换均无直接证据，也没有消费者闭环；值得补的最小用例必须依附于真实消费者（例如由选中记录版本提供 old/new），在此之前不应仅对组件再补静态变体测试。

### 工作台级联动

- 未定位一个测试或证据把详情主体、审计、活动、附件/关联、版本差异放在同一详情工作台中，并以对象 A→B 切换后断言旧内容全部消失、新内容来自 B。
- 存在 `BoundRecordDetailDrawer` 的 `extraSections` 扩展点，但扩展点存在不等于消费者已正确按对象作用域挂载审计/活动。

## 未覆盖项

- 真实审计/详情 Provider、服务端 RBAC、租户/字段权限和持久化。
- 详情对象 A→B 切换时活动区/附件/关联/版本差异的同步清空与重新加载；审计侧栏已补同一 provider 的 recordId A→B 窄用例，但未覆盖 provider 与 recordId 同时切换及工作台整体联动。
- 版本差异的空态、错误态、权限拒绝、对象切换和真实版本历史；本轮只运行 `version-diff-viewer.test.svelte.ts` 单文件（pi 自测 1/1、exit 0、14.78s；主线程独立复核 1/1、exit 0、15.91s；两次独立），仍仅覆盖静态渲染，未新增测试。
- 关联读取权限与跨对象关联残留。
- 真实浏览器交互、读屏、发布包和部署。
- 第一轮只运行 `audit-log-viewer-scope.test.svelte.ts`，补强轮只运行 `scoped-async-consumers.test.svelte.ts`，本轮版本差异审计只运行 `version-diff-viewer.test.svelte.ts`；`detail-contract`、`audit-timeline` 等未在 B3-05 专项重跑，其历史结果不得与本专项结果合并计数。各次运行分别独立记录。
- 历史 `audit-log-viewer-scope` 的 pi 2/2 与主线程复核 2/2 保持独立；`scoped-async-consumers` 旧版（修正前）pi 10/10、15.97s 与旧版主线程独立复核 10/10、9.16s 也是两次独立运行；审查修正后的新版 pi 11/11、exit 0（未提供 duration）与主线程独立复核 11/11、exit 0、9.36s 为两次独立运行。三组 `scoped-async-consumers` 结果不相互合并，也不与历史 2/2 合并。

## 结论

版本差异本轮只读审计并只运行 `version-diff-viewer.test.svelte.ts` 单文件，pi 自测 1/1、exit 0、14.78s，主线程独立复核 1/1、exit 0、15.91s，两次独立、不合并；仍只证明静态旧/新值渲染，组件无空态/错误/权限/对象作用域状态，且未定位详情工作台消费者，因此不能宣称版本差异闭环。B3-05 的“审计”有三组独立记录：历史 `audit-log-viewer-scope` 证明 authProvider+tenant 切换关闭审计快照、仅分页变化保留（pi 2/2、5.88s；主线程独立复核 2/2、6.94s）；`scoped-async-consumers` 旧版（审查修正前，保留）证明同一 provider 记录 ID A→B 时 B 先显示、A 迟到不残留（pi 10/10、15.97s；主线程独立复核同一命令 10/10、9.16s，另确认 `git diff --check` exit 0）；审查修正后新版先 resolve A 并确认显示，再仅切 recordId 到 B 时立即断言 A 清空且 B 请求已发，B resolve 后显示 B，并保留迟到 A 不覆盖用例，两个用例均精确断言 2 次请求的 A/B meta（pi 11/11、exit 0，pi 未提供 duration 故不记录；主线程独立复核 11/11、exit 0、9.36s，另确认 `git diff --check` exit 0）。上述每次运行分别独立记录、不合并。“记录 ID A→B 旧审计不残留”已由旧版（修正前）两次直接证据支持，并新增新版对“已显示后立即清空”的 pi 与主线程两次独立覆盖；历史 `audit-log-viewer-scope` 2/2 仍单独保留。“旧详情不残留”有既有源码与测试断言支持；“关联、附件、活动、版本差异”多为独立组件或静态渲染证据，尚未形成详情工作台闭环。真实服务、浏览器/读屏与发布均未验收。

## 新 provider 与 recordId 同时切换的最小证据（2026-10-22，仅补测试）

- 目标：按只读审计结论选择一个源码契约可直接证明的最小缺口——`AuditLogDrawer` 在同一详情内“新 provider 与 recordId 同时切换”时旧审计不残留。未发现明确生产缺口，因此只补最小测试与证据，未改生产代码、Core/Provider 协议、布局或颜色；未 commit、push、deploy。
- 源码契约：`AuditLogDrawer.svelte` 的 `$effect` 同时读取 `adminContext.auditLogProvider`、`resource`、`recordId`、`open` 与 provider meta，作用域变化先 `clearAuditScope()`，并用 `requestEpoch` 丢弃旧请求结果；因此本用例直接验证既有契约，不新增产品 API。
- 修改范围：仅 `packages/ui/src/components/scoped-async-consumers.test.svelte.ts`、本证据文档与 B3-05 验收矩阵。测试宿主已有 `recordId` 与 `auditLogProvider` props，无需改动。
- 新增用例：同一 tenant/resource 下，旧 provider A 请求先 resolve 并显示 `record-a-auditor`；随后一次 `rerender` 同时把 `auditLogProvider` 换为新 provider、`recordId` 从 `record-a` 改为 `record-b`。立即断言 A 日志消失、旧 provider 不再被调用、新 provider 仅收到 `{ resource: 'orders', meta: { recordId: 'record-b', tenantId: 'tenant-current' } }`；新 provider B resolve 后显示 `record-b-auditor`，A 仍不残留。
- 运行命令（工作目录 `packages/ui`）：`bunx vitest run --config ./vitest.config.ts src/components/scoped-async-consumers.test.svelte.ts`
- 结果：`1 passed` 文件，`12 passed` 用例；原始退出码 `0`；Vitest duration `9.36s`；执行主体为 **pi 自测**。该 `12/12` 包含既有 11 个用例与本轮新增 1 个用例，不与历史 11/11、旧版 10/10、历史 2/2 合并计数。
- `git diff --check`：原始退出码 `0`。
- 主线程独立复核：同一单文件命令通过，`1 passed` 文件、`12 passed` 用例，原始退出码 `0`，Vitest duration `8.57s`；`git diff --check` 原始退出码 `0`。该结果与 pi 自测分开记录，不合并计数。
- 审查补强：pi 在同一用例补充旧 provider 首次请求的完整 A scope，以及 B 显示后两 provider 最终各调用一次；未改生产。补强版 pi 报告单文件 12/12 通过、diff 检查通过，未提供耗时；上面的 `9.36s` 属于补强前结果，`8.57s` 为主线程对补强版的独立运行。该场景的 A 已完成，不证明同时切换 provider/recordId 时旧在途请求的成功或失败隔离。
- 边界：只证明 `AuditLogDrawer` 同一详情侧栏在新 provider 与 recordId 同时切换时清空旧审计并绑定新 scope；不证明详情工作台五区整体联动、真实审计服务/RBAC、真实租户或字段授权、服务端延迟/取消、读屏、发布包或部署。`VersionDiffViewer` 仍只有静态值渲染与受控工作台消费者证据，没有真实版本历史服务或“选中记录版本 → oldValue/newValue”真实消费者闭环。

## 版本选择公开契约只读审计（2026-10-23，阻塞记录）

- 目标与范围：按 B3-05 只读检查 `VersionDiffViewer`、版本历史/provider、`DetailWorkspace` 配置、记录版本 API 与既有 tests/docs，确认是否存在明确的“选中记录版本 → oldValue/newValue”公开契约。本轮仅修改本证据文档与 B3-05 矩阵，未改生产代码、测试、Core/Provider 协议、布局或颜色；未 commit、push、deploy，既有脏改动全部保留。
- 已存在且可复用的契约：`packages/ui/src/components/detail-workspace.ts` 导出 `DetailWorkspaceVersionData { oldValue, newValue, oldTitle?, newTitle?, fieldLabels? }`，`DetailWorkspaceSectionsConfig.versions` 接受 `DetailWorkspaceSection<DetailWorkspaceVersionData>`；`DetailWorkspaceSections.svelte` 的 `versionRenderer` 把该数据传给真实 `VersionDiffViewer`。`DetailWorkspaceProvider.load(scope, signal)` 的 scope 只有 `resourceName`/`recordId`/可选 `meta`，没有版本标识或版本选择入参。`DetailWorkspaceAsyncSection.svelte` 为所有异步区提供通用的 loading/empty/error 状态与 Retry，空态由可选 `empty(data)` 判定。
- 缺口证据：`VersionDiffViewer.svelte` 只接收 `oldValue`/`newValue`/标题/`viewMode`/`fieldLabels`/`class`，没有版本列表、版本 ID、选中回调或历史查询；“选中记录版本”这一动作在组件、provider scope、`AutoTable.detailWorkspace` 或 `BoundRecordDetailDrawer.extraSections` 路径中均不存在。`packages/core/src` 只读搜索未发现 `getVersion`/`listVersions`/`recordVersion`/`VersionProvider` 等记录版本 API 或 schema；现存 `version` 命中主要是包版本、冲突回执与审批历史，不是记录版本历史。
- 既有测试边界：`packages/ui/src/components/detail-workspace.test.svelte.ts` 已通过真实 `AutoTable` 消费者覆盖 versions provider 的初始加载、记录 A→B 切换、迟到失败不覆盖 B、父记录 `show` 拒绝/撤销时不读取，以及附件错误/Retry；`version-diff-viewer.test.svelte.ts` 只覆盖静态旧/新值渲染。现有用例均未出现“选择一个历史版本”的输入，也未断言版本列表/版本标识，因此不能作为“选中记录版本 → oldValue/newValue”的直接证据。
- 决策：不存在明确的“选中记录版本 → oldValue/newValue”公开契约；在没有版本列表/版本标识/版本读取 API 的情况下，新增消费者测试只能重复通用异步状态或静态渲染，不能证明该契约。按约束不凭空设计版本 API、版本选择状态或后端 schema，本轮不新增测试。阻塞原因是缺少记录版本历史与版本选择的生产契约，需要真实版本服务或产品确认后另立契约，而不是由 `DetailWorkspaceVersionData` 的 old/new 载荷推断。
- 本轮运行：因未新增或修改测试，未运行 Vitest 单文件，避免重复既有 `version-diff-viewer` 静态 1/1 与五区受控浏览器证据；仅运行 `git diff --check`，原始退出码 `0`。未运行全仓 test/build/typecheck、浏览器、读屏或发布流程。
- 结论边界：本记录只把“版本选择契约缺失”固定为当前可复核的阻塞项，并保留既有 versions provider 的加载/空态/错误/记录作用域/父记录权限能力；不把通用 async section 能力或受控 `DetailWorkspaceVersionData` 外推为真实版本历史闭环，也不据此宣称 B3-05 版本差异已完成。

## 本线程复核（2026-10-23）

- 只读核对 `detail-workspace.ts`、`DetailWorkspaceSections.svelte`、
  `DetailWorkspaceAsyncSection.svelte` 与 `VersionDiffViewer.svelte`：
  `DetailWorkspaceAsyncSection` 在作用域变化时先清空旧数据，旧成功/失败回执
  不写回当前区；空结果、加载失败和显式重试均有独立状态。默认审计读取在
  父记录 `show` 未获准时不启动，详情扩展区也只在父记录读取成功后挂载。
- `VersionDiffViewer` 仍是受控 old/new 值展示器，没有版本列表、版本 ID、
  选择事件或历史读取入口。把“两个空对象”改成版本专属空态，或给组件新增
  版本权限/错误 props，都会先定义业务语义；当前不能从 `0 changes` 推断
  “无版本”或“无权限”。
- 定向复跑：

  ```bash
  bunx vitest run --config ./vitest.config.ts src/components/detail-workspace.test.svelte.ts
  ```

  `9/9 passed`，退出码 `0`，未修改生产代码或测试；仅有既存
  `svelte2tsx/index.js.map` 缺失警告。
- 结论不变：当前可安全确认的是异步区状态/作用域隔离和父记录 fail-closed；
  “选中记录版本 → oldValue/newValue”仍缺少版本历史服务与公开契约，不新增
  版本 API、版本 ID、选择状态或后端权限假设。
