# 企业级 UI 剩余项最小决策包（2026-10-24）

## 最新续接

用户后续明确要求“解决阻塞”，已按推荐默认值进入
`enterprise-ui-unblock-contract-20261024.md` 的分阶段实施。
下文“本轮只做文档”“需批准”和原始源码基线是决策包形成时的历史状态，
不再要求用户重复回复第 7 节的批准模板。
内部引用、草稿适配器、`oneOf` 分支和 example 业务消费者接入均已有本地实现
及定向证据，见 [当前收口记录](enterprise-ui-closeout-20261024.md)。
下文“当前源码”描述是决策时基线，不代表最新源码；不再将上述能力列为待批准
或待实施。真实服务验收仍需环境、身份与允许操作范围，不能宣称已经全部完成。
远程 Schema 加载本轮明确禁止，B4 保持按需未选。

## 0. 用途与边界

本文原用于产品与安全评审。用户已要求解决阻塞，推荐默认值已执行；当前仅保留
历史契约、实施边界和真实验收输入，不再把以下本地能力当作待批准选择：

- `B3-09` 多标签工作区的**草稿内容恢复**；
- `B2-11` 完整 Schema 表单的**内部引用与分支选择受控适配**；
- `B4-01..B4-04` 明确保持“按需扩展”，**不在本轮选择或实施**。

本轮不修改源码、测试、已有台账或证据；不运行全量测试；不提交、推送、发布或部署。
`pi` 是唯一文档 writer。本文引用现有源码与证据，但不把既有文档结论冒充为当前
源码的逐项重验，也不把“本地可实施”当成真实服务、读屏或发布验收。

依据：

- `docs/evaluations/enterprise-ui-scope-disposition-20261024.md`
- `docs/evidence/schema-form-b2-11-boundary-audit-20261023.md`
- `docs/evaluations/b3-09-tab-eviction-decision-20261023.md`
- 当前 `packages/ui/src/components/workspace-tab-state.ts`、
  `packages/ui/src/components/MultiTabKeepAlive.svelte`、
  `packages/ui/src/components/JsonSchemaForm.svelte`、
  `packages/ui/src/components/enterprise/recursive-schema-form.ts`、
  `packages/ui/src/components/enterprise/json-schema-form.ts`、
  `packages/ui/src/components/json-schema-form-state.ts`

## 1. 三档判定口径

| 判定 | 含义 | 本轮是否可做 |
| --- | --- | --- |
| **已完成** | 当前源码或已有证据已经支持的本地能力；本文只引用，不重跑、不外推 | 不重复实现，不重新宣称验收 |
| **可直接实施** | 用户批准本文推荐契约后，工程侧无需再等新的产品/安全输入即可实现并做定向验证 | 仅在批准后另立实现任务 |
| **需批准** | 必须先由产品/安全确认数据边界、公开 API、冲突语义或外部信任边界 | 本轮只列选项和推荐默认值 |

“可直接实施”不等于“已批准”，也不等于发布就绪。任何实现仍需独立 writer、
定向测试、diff 检查和证据记录；真实服务、真实身份、实机读屏与发布仍需单独授权。

## 2. 基线与续接结果

### 2.1 B3-09 已完成部分

以下为已有本地实现与证据，本文不重跑、不累计：

- 标签选择、关闭保护、固定标签、批量关闭、刷新入口、键盘 roving tabindex；
- `maxTabs` 原子准入与 LRU 淘汰，固定/活动/`dirty=true`/不可关闭标签不自动淘汰；
- 查询、滚动、path 恢复与租户/标签/path 隔离；
- 跨 adapter 的关闭清理：删除需回读确认，失败时写关闭信封并保留共享阻断；
- 受控消费者浏览器矩阵与真实 AutoForm 关闭保护接线。

关键证据路径：

- `docs/evaluations/b3-09-tab-eviction-decision-20261023.md`
- `docs/evidence/workspace-tabs-consumer-20261024.md`
- `docs/evidence/workspace-lifecycle-cross-browser-20261024.md`
- `docs/evidence/workspace-scroll-boundaries-20261024.md`
- `docs/evidence/workspace-navigation-readiness-20261024.md`

历史基线曾只有 `query`、`scrollTop`、`scrollLeft`、`draft: boolean`。当前已
增加宿主 opt-in 的白名单草稿内容、64KiB/纯 JSON 限制、作用域隔离、显式恢复
和失败诊断；本地适配器与受控消费者证据分别为 43/43、18/18。真实身份、
生产 storage、服务端冲突和跨窗口语义仍属外部验收。

### 2.2 B2-11 已完成部分

以下为已有本地实现与证据：

- 有界递归 `object`/`array`/标量子集、数组逐项错误、JSON Pointer 路径；
- 深度 32、节点 10,000、字符 1,048,576 等 `SCHEMA_FORM_LIMITS`；
- 循环、访问器、非普通对象、稀疏数组、未知关键字、外部 URI 均 fail closed；
  内部引用和显式 discriminator oneOf 已按后续契约开放；
- 不支持配置时表单级 `role="alert"`、不渲染输入、禁用提交；
- 显式拒绝路径已有单文件与浏览器证据支持。

关键证据路径：

- `docs/evidence/schema-form-b2-11-boundary-audit-20261023.md`
- `docs/evidence/schema-form-unsupported-schema-20261022.md`
- `docs/evidence/schema-form-b2-11-browser-unsupported-20261023.md`

当前边界：仅支持有界内部 `#/$defs/...` 引用和显式 discriminator 驱动的
`oneOf`，稳定 code/JSON Pointer 由递归 helper 提供；不支持远程 resolver、
`anyOf`/`allOf` 或完整 JSON Schema。真实服务端 Schema 一致性仍需外部验收。

## 3. B3-09 草稿内容恢复：推荐默认契约

### 3.1 推荐默认值（建议产品/安全直接批准）

1. **显式 opt-in**：草稿内容保存必须由宿主显式开启；默认只保存现有查询/滚动/
   dirty 布尔，不保存字段内容。
2. **仅 JSON 可序列化值**：只接受 `null`、布尔、有限数字、字符串、普通对象、
   数组；禁止 `File`、`Blob`、函数、Symbol、`Date`、`Map`、`Set`、类实例、
   访问器、稀疏数组、循环引用、非普通原型对象和 `undefined` 字段。
3. **默认不保存**：未显式 opt-in、未提供字段白名单、或序列化/大小检查失败时，
   不写入 storage，也不因“有 dirty 标记”自行持久化任何字段。
4. **字段白名单由宿主提供**：适配器只接收宿主给出的字段路径/键白名单；不做
   自动全量表单快照，不从 DOM 猜测字段，不保存未列入白名单的值。
5. **单条大小上限 64KiB**：以 UTF-8 序列化后的字节数计；超过即 fail closed，
   不截断、不部分保存，并向宿主返回明确失败原因。
6. **隔离键**：`tenant + user + tab + path` 共同构成作用域；身份或 path 变化
   必须视为不同草稿，禁止跨租户、跨用户、跨标签或跨路由复用。
7. **存储位置**：默认建议 `sessionStorage`；是否跨刷新、跨窗口、持久化到服务端
   或本地长期存储由宿主决定，组件不自行选择生产存储。
8. **保留期由宿主决定**：默认随标签关闭/会话结束清理；TTL、最大保留时间、
   清理时机、登出/切租户清理必须由宿主显式配置或调用。
9. **清理失败 fail-closed**：删除失败或回读仍见旧值时，不得报告清理成功；继续
   使用现有共享关闭阻断/关闭信封，无法保证跨刷新删除时明确返回失败。
10. **恢复冲突不自动覆盖服务端**：默认只恢复到“未提交草稿”状态，不自动写回
    服务端、不自动合并、不以草稿覆盖更新的服务端版本。检测到服务端版本变化、
    身份变化或 path 不匹配时，应放弃自动恢复并交由宿主提示。

### 3.2 分类

| 分类 | 内容 |
| --- | --- |
| **已完成** | 查询/滚动/path 快照、租户+标签+path 隔离、关闭清理与失败阻断、LRU 淘汰、关闭保护、键盘和受控消费者路径 |
| **已完成** | 宿主 opt-in 草稿内容、字段白名单、纯 JSON/64KiB 限制、`tenant+user+tab+path` 隔离、显式恢复、冲突拒绝与清理失败诊断；受控消费者已验证 |
| **外部验收** | 生产 storage、真实身份/RBAC、跨窗口策略、服务端版本冲突、PII/保留期合规与部署 |

### 3.3 需要用户确认的 3-5 个选择

| # | 选择 | 推荐默认 | 备选/影响 |
| --- | --- | --- | --- |
| B3-1 | 草稿内容是否保存 | **默认不保存，仅宿主显式 opt-in** | 始终不保存：最安全但刷新恢复不完整；自动保存全部字段：不可接受，PII/文件/体积不可控 |
| B3-2 | 字段范围 | **宿主提供字段白名单** | 表单级全量快照、按 Schema 推导、仅标量字段；后三者仍需明确敏感字段和嵌套规则 |
| B3-3 | 存储与保留期 | **默认 sessionStorage；保留期由宿主决定** | localStorage/IndexedDB/服务端持久化；跨刷新、跨窗口、TTL 和登出清理必须另行确认 |
| B3-4 | 恢复冲突 | **只恢复未提交草稿，不自动覆盖服务端** | 服务端优先并丢弃草稿、提示用户选择、自动合并；自动合并需要业务版本/字段契约，不建议本轮做 |
| B3-5 | 清理/写入失败语义 | **fail-closed，不报告成功；超过 64KiB 不保存** | 允许截断、允许仅内存降级、允许重试队列；这些都需要宿主可见状态和额外错误契约 |

### 3.4 实现后的验收命令与证据

实现任务至少执行以下定向验证，并在证据文档记录命令、退出码、用例数和边界：

```bash
cd packages/ui
bunx vitest run --config ./vitest.config.ts \
  src/components/workspace-tab-state.test.svelte.ts \
  src/components/multitab-eviction.test.svelte.ts \
  src/components/multitab-close-protection.test.svelte.ts

cd ../..
bunx playwright test --config playwright.workspace-tabs.config.ts
bunx playwright test --config playwright.workspace-tabs.cross-browser.config.ts
git diff --check
```

必须新增/补充的证据：

- 草稿值含 `File`/`Blob`/函数/循环/非普通对象时被拒绝；
- 超过 64KiB 时整条不保存，返回明确失败；
- 白名单外字段不进入快照；
- 不同 `tenant`/`user`/`tab`/`path` 不互相恢复；
- 刷新/淘汰/重建后只恢复未提交草稿，不触发服务端写入；
- 清理失败时 `clear` 返回失败，后续实例不恢复旧草稿；
- 定向单测、浏览器矩阵、目标 ESLint、严格类型检查与 `git diff --check` 结果。

### 3.5 不能承诺的边界

- 不承诺“任何表单都能无损恢复”：只保证白名单内、JSON 可序列化、64KiB 内的值。
- 不承诺 PII 合规、加密、审计、数据驻留或服务端保留策略；这些属于宿主/安全评审。
- 不承诺跨窗口同步、跨浏览器标签页同步、生产 storage 配额或隐私模式可用性。
- 不承诺真实身份切换、真实 RBAC/租户、真实后端版本冲突的完整性。
- 不承诺实机读屏、发布包消费、部署或生产验收。
- 清理信封也无法写入时，跨刷新删除仍不能保证；只能明确报告失败。

## 4. B2-11 受控引用适配：推荐默认契约

### 4.1 推荐默认值（建议产品/安全直接批准）

1. **只允许内部 `#/$defs/...` 引用**：解析根必须限制在当前 Schema 文档内；
   不接受远程 URI、相对 URI、跨域 URL、网络加载或宿主未声明的外部文档。
2. **明确上限**：最大解析深度 32、总节点 10,000、`$ref` 解析次数/唯一目标
   上限 256（具体数值批准时固定）；超过上限 fail closed，不静默截断。
3. **禁止网络与副作用**：解析过程不得发起 fetch/XHR/动态 import，不得访问
   `window`/storage/环境变量，不得执行 Schema 中的代码或 getter；循环引用
   必须被检测并拒绝。
4. **`oneOf` 必须显式选择分支**：需要稳定的 `discriminator` 字段，或由宿主
   提供显式 branch selector UI；不得按“第一个能通过的分支”、字段相似度或
   猜测自动选择。未选择/多分支歧义时给出确定错误。
5. **公开稳定错误契约**：对外提供稳定错误 `code` + JSON Pointer；错误文案可
   国际化，但 `code` 和路径语义不得随文案变化。不得把内部临时 `issues` 直接
   当公开 API 导出。
6. **解析无副作用、不可循环**：同一 Schema/数据重复解析结果一致；不修改输入
   Schema 或表单值；不使用全局可变缓存产生跨请求/跨租户污染。
7. **远程 resolver 后续另立安全评审**：本轮不实现、不预留隐式网络回退；若未来
   需要远程引用，必须单独评审允许列表、超时、大小、鉴权、SSRF、缓存、完整性
   与审计，不能由本契约自动授权。

### 4.2 分类

| 分类 | 内容 |
| --- | --- |
| **已完成** | 有界 object/array/标量递归、JSON Pointer 错误路径、循环/访问器/非普通对象拒绝、未知关键字及不支持的引用/分支形状 fail-closed、表单级可感知拒绝 |
| **已完成** | 内部 `#/$defs` 解析、深度/节点/引用次数上限、循环检测、显式 `oneOf` selector、分支默认值/旧字段清理、稳定错误 code 与 JSON Pointer；递归 32/32、企业表单 81/81 |
| **明确禁止/另立评审** | 远程 resolver、SSRF/鉴权/缓存/完整性策略、服务端 Schema 一致性和实机读屏；这些不是本地 oneOf 阻塞 |

### 4.3 需要用户确认的 3-5 个选择

| # | 选择 | 推荐默认 | 备选/影响 |
| --- | --- | --- | --- |
| B2-1 | 引用作用域 | **仅内部 `#/$defs`** | 允许相对 URI、允许远程 URI、完全禁止任何 `$ref`；远程会引入网络/SSRF/鉴权边界 |
| B2-2 | 资源上限 | **深度 32、节点 10,000、引用 256** | 更小上限更安全但限制复杂表单；更大上限需性能与大 Schema 证据 |
| B2-3 | `oneOf` 选择 | **显式 discriminator 或宿主 branch selector** | 自动尝试首分支、按 const/enum 猜测、仅显示错误让用户重选；自动猜测不建议 |
| B2-4 | 错误 API | **公开稳定 `code` + JSON Pointer** | 仅表单级 alert、导出内部 issues、只返回文案；后两者不稳定或不利于消费者 |
| B2-5 | 远程 resolver | **本轮禁止，未来另立安全评审** | 现在实现允许列表/超时/鉴权/SSRF；会扩大范围，不应与本轮内部引用捆绑批准 |

### 4.4 实现后的验收命令与证据

实现任务至少执行以下定向验证，并在证据文档记录命令、退出码、用例数和边界：

```bash
cd packages/ui
bunx vitest run --config ./vitest.config.ts \
  src/components/enterprise/recursive-schema-form.test.ts \
  src/components/json-schema-form-enterprise.test.svelte.ts

cd ../..
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.schema-form.config.ts
git diff --check
```

必须新增/补充的证据：

- `#/$defs` 正常解析、缺失目标、非法 Pointer、循环引用、超深/超节点/超引用次数；
- 远程 URI、相对 URI、跨域 URL 被拒绝且无网络请求；
- `oneOf` 有 discriminator、无 discriminator、分支冲突、未选择分支的确定错误；
- 公开错误 `code` 与 JSON Pointer 稳定，表单级可感知状态保留；
- 输入 Schema/值未被修改，重复解析结果一致；
- 定向单测、专属浏览器配置、目标 ESLint、严格类型检查与 `git diff --check` 结果。

### 4.5 不能承诺的边界

- 不承诺完整 JSON Schema 支持；`allOf`/`anyOf`/远程 `$ref`/`format` 等仍需逐项
  决策，不能因内部引用获批而自动纳入。
- 不承诺远程加载、SSRF 防护、允许列表、超时、鉴权、缓存或完整性；本轮明确禁止。
- 不承诺服务端 TypeBox、业务授权、跨租户字段权限或服务端校验一致性。
- 不承诺真实 Provider、真实消费者构建、读屏实机、发布包或部署验收。
- 不承诺错误文案永久不变；只承诺已批准的 `code` 与 JSON Pointer 语义。
- 不承诺 `oneOf` 自动推断业务分支；业务含义必须由 discriminator 或宿主选择提供。

## 5. B4：本轮明确不选择

`B4-01` Kanban/Scheduler/Gantt、`B4-02` Pivot/Spreadsheet、`B4-03`
Workflow/DecisionTable、`B4-04` 富文本/代码/文档仍为**按需扩展**。本轮：

- 不选场景、不定引擎、不做许可/包体积决策；
- 不把现有窄契约（如 Kanban 移动、有限表格）当作整项完成；
- 不因 B3-09/B2-11 获批而自动启动 B4；
- 需要时另立产品场景与验收契约，不并入本轮最小决策包。

## 6. 外部验收与不承诺事项

截至 2026-10-26，B2-11 的本地受控外部引用子集已实施并通过定向单测、
`oneOf` 六浏览器矩阵和 `bun run check`。这里的“外部”仅指宿主显式注入的已取得
普通文档，不代表远程 HTTP resolver，也不改变下列真实服务验收边界。

即使上述契约获批并完成本地实现，也不能承诺：

- 真实 Provider、真实 RBAC/租户、真实后端持久化与冲突处理的完整性；
- 屏幕阅读器实机认证、移动视觉验收或全浏览器长期稳定性；
- 生产 storage 配额、隐私模式、跨窗口/跨设备同步；
- 新分发包、消费者构建、registry 发布、部署或生产回滚；
- 任何未在批准范围内明确列出的 Schema 关键字、草稿字段或 B4 领域能力。

## 7. 用户只需回复的一行批准格式

请直接回复以下任一行（可只改“暂不选择/批准”措辞）：

```text
批准 B3-09 默认契约；批准 B2-11 内部引用契约；B4 暂不选择
```

如需调整，请只在同一行内替换对应项，例如：

```text
批准 B3-09 默认契约但仅用 sessionStorage；批准 B2-11 内部引用契约；B4 暂不选择
```
