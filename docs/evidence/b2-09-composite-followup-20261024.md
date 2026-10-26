# B2-09 复合字段本地续接（2026-10-24）

## Task Contract

- parent: `docs/evaluations/enterprise-ui-remaining-20261023.md`
- source: 用户要求续接企业级目标，处理 B2-09 仍可本地闭环的复合字段交互缺口。
- reason: 既有 B2-09 证据已覆盖多个复合控件的帮助/错误 IDREF、首错聚焦和部分真实键盘路径；仍需区分“尚未证明的本地行为”和必须由产品、读屏或服务契约决定的边界。
- orchestration: managed；低风险；pi 为唯一 writer，主线程独立审查。
- goal: 只读审计后选择一个具有明确现有 API、可本地验证的窄缺口，用最小生产或测试改动闭环，并给出主线程可独立复跑的验证命令。
- non-goals: 不新增 `rowErrors`、错误路径或索引错误模型；不新增父值/strict 选择协议；不猜产品决策；不把真实读屏、服务端错误映射、Provider/RBAC、真实上传服务或发布当成本地补丁。
- workspace: 保留全部 dirty；不提交、不推送、不部署；不跑全仓。

## 只读审计：尚未由现有契约证明的本地行为

以下仅列本地可核对行为；真实读屏、真实服务/授权和发布不计入本地缺口。

| 控件 | 现有契约已证明 | 尚未证明的本地行为 | 结论 |
| --- | --- | --- | --- |
| Transfer | 组标签、help/error IDREF、实例隔离、禁用态、搜索、双向转移、全选状态、选择回收已有组件断言；真实 AutoForm 键盘右移与精确载荷已有三引擎两视口证据。 | 真实浏览器下反向移除、全选按钮的完整键盘路径；移动最后一项后焦点落点；更大规模的完整 Tab 顺序。 | 现状主要是证据扩展；焦点落点需产品/交互决策，本轮不猜。 |
| TreeSelect | 单 Tab 停靠、树内方向键/搜索/懒加载/级联、弹窗引用、真实 AutoForm 首错聚焦与 Escape 复原已有证据；trigger 的 invalid 语义为 `data-invalid`。 | 是否把 trigger 改为 `aria-invalid`；父值是否回传、strict/non-strict；完整父子策略矩阵。 | 前两项为产品/无障碍语义决策，不能静默改写既有契约。 |
| Cascader | 列内 Home/End、方向键、禁用跳过、异步加载/重试、焦点复原、真实 AutoForm 首错聚焦与 `changeOnSelect=true` 载荷已有证据。 | 默认叶子路径与 `changeOnSelect` 全矩阵；父项是否进入 `value`；edit/懒加载组合。 | 父子路径语义需产品契约；不在本轮新增协议。 |
| DateRangeInput | presets、start、end 的 help/error IDREF、实例隔离、label 关联、原生提交名、首错聚焦、摘要键盘返回与 preset→start 真实 Tab 已有证据。 | end 侧修改后的跨边界校验/提交语义；禁用日期、DST/时区和部分分段清空。 | 多为服务/产品语义或既有日期策略延伸，不属于安全窄补丁。 |
| RichText | 正文与工具栏键盘路径、首错聚焦、IDREF 隔离、精确 HTML 载荷、扩展去重与真实 transaction 已有证据。 | 完整扩展策略、真实附件上传、工具栏控件是否逐个关联字段错误。 | 工具栏关联可能造成噪声，需先定义字段级反馈范围；上传属服务边界。 |
| FileUpload | 原生 input/dropzone 双入口的 help/error IDREF、实例隔离、动态清理、禁用打开、原生提交、队列/reset/作用域生命周期与 AutoForm 引用模式已有证据。 | 队列内 cancel/retry/remove 与既有附件 remove 操作未关联字段 help/error；多文件同名操作的可访问名仍为通用动作名；拒绝列表未关联字段反馈。 | 前一项有明确现有 API（`describedby`/`invalid`）且与 images 的既有做法一致，可安全窄修；可访问名与拒绝列表属于另一个交互/文案决策，本轮不改。 |

## 选定缺口与 Gherkin

选定：文件字段附件操作按钮（队列 cancel/retry/remove 与既有附件 remove）缺少字段说明/错误关联。复用现有 `describedby`、`invalid` 与 `aria-describedby`/`aria-invalid` 协议，不新增字段值或错误模型。

```gherkin
Scenario: 上传队列操作可追溯到所属字段反馈
  Given 文件字段有说明和宿主错误节点
  And 队列中存在上传中、失败/取消或成功的附件
  When 用户聚焦取消、重试或移除按钮
  Then 每个动作按钮的 aria-describedby 解析到本字段的说明与错误
  And aria-invalid 跟随当前字段 invalid 状态

Scenario: 既有附件移除使用同一反馈协议
  Given 编辑表单已经回显可序列化附件引用
  When 用户聚焦该附件的移除按钮
  Then 移除按钮关联所属字段的说明与错误

Scenario: 实例隔离与动态清理
  Given 两个同构文件字段同时存在
  When 第一个字段的说明或错误被清理
  Then 第一个字段的动作按钮收敛到剩余反馈
  And 第二个字段的动作按钮引用保持不变

Scenario: 禁用与提交边界不变
  Given 文件字段处于禁用态或上传尚未解决
  When 用户尝试操作附件动作
  Then 既有禁用和 AutoForm 提交阻断语义保持不变
```

## 边界

- 本证据只证明本地 DOM/组件反馈关联，不证明真实读屏、真实上传服务、服务端错误映射、Provider/RBAC、发布或部署。
- 不新增上传取消/清理语义，不改变按钮可访问名、禁用状态、队列状态机或原生提交。
- 不把父级字段错误扩展为行级/子字段错误协议。

## 执行记录

### 实施

- `packages/ui/src/components/FileUpload.svelte`：队列内 `cancel`、`retry`、`remove`
  按钮透传字段 `aria-describedby` 与 `aria-invalid`；队列状态机、按钮可访问名、
  禁用条件和回调均未改变。
- `packages/ui/src/components/FileUploadField.svelte`：既有附件 `remove` 按钮使用
  同一字段反馈协议；移除行为未改变。
- `packages/ui/src/components/file-upload-field-feedback.test.svelte.ts`：新增两条
  真实 `FieldRenderer` 双实例回归，覆盖队列 cancel/retry/remove、既有附件 remove、
  活 IDREF 解析、跨实例隔离、动态清理后仅保留说明以及 `aria-invalid` 收敛。

### 验证（pi 自测）

均从 `packages/ui` 或仓库根目录执行，未跑全仓：

| 命令 | 结果 |
| --- | --- |
| `bunx vitest run --config ./vitest.config.ts src/components/file-upload-field-feedback.test.svelte.ts` | **13/13 passed**，exit `0`，11.18s |
| `bunx vitest run --config ./vitest.config.ts src/components/file-upload.test.svelte.ts src/components/auto-form-file-upload.test.svelte.ts` | **56/56 passed**，exit `0`，10.77s |
| `bunx eslint --max-warnings 0 packages/ui/src/components/FileUpload.svelte packages/ui/src/components/FileUploadField.svelte packages/ui/src/components/file-upload-field-feedback.test.svelte.ts` | exit `0`，0 警告 |
| `git diff --check` | exit `0` |

本轮未运行浏览器矩阵、全仓测试、pack、提交、推送或部署。主线程可独立复跑上表
四条命令；其中 `FileUploadField.svelte` 在工作区为未跟踪文件，复核时需按实际
路径检查，而不是只看 `git diff --stat`。

### 主线程独立验收

- 审查队列三个动作及既有附件移除的属性透传；行为、禁用条件与状态机未改动。
  两个新增用例使用真实 FieldRenderer 双实例，逐个解析 IDREF，并验证 A 的
  错误/说明清理不影响 B。测试是 DOM 关联证据，不是实际键盘焦点或读屏证据。
- 仅复跑直接相关的单文件
  `bunx vitest run --config ./vitest.config.ts src/components/file-upload-field-feedback.test.svelte.ts`：
  **13/13**，exit 0，9.83s。三目标文件 ESLint `--max-warnings 0` 与
  `git diff --check` 均 exit 0。
- 未复跑实施端的其他上传测试，不合并计数；未重建分发包，5187 预览不作为
  本次新增属性的验收证据。真实浏览器、读屏、服务和发布边界保持未验收。

### 剩余边界

- 多文件 action 的可访问名仍为通用动作名；是否改为包含文件名需要交互/文案确认。
- 拒绝文件列表未关联字段 help/error；其展示与错误模型尚未定义。
- 真实读屏、真实上传服务、服务端错误映射、Provider/RBAC、发布和部署均未验证。

## 2026-10-26 完整 AutoForm 跨浏览器复验

- 主线程独立执行
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --reporter=line`。
- 当前矩阵 **102/102 passed**，exit `0`，耗时 **2.2m**，无 skip；Chromium/WebKit/Firefox
  的 desktop/narrow 六个项目全部执行，每个项目 **17/17**。
- 覆盖普通错误摘要、ArrayField、DateRangeInput、TreeSelect、Cascader、Transfer、
  RichText、Tags、Multiselect、Images，以及 provider/scope 切换后的迟到响应和
  dirty 草稿隔离。焦点、ARIA IDREF、错误摘要、提交载荷、实例隔离和 `pageerror`
  断言均通过。
- 本次仅产生浏览器验收证据，未修改生产组件、公开 API 或测试契约；`git diff --check`
  通过。该结果收口 B2-09 当前复合 AutoForm 的本地跨引擎矩阵，不替代真实读屏、
  真实上传服务、服务端错误映射、Provider/RBAC、发布或部署验收。
