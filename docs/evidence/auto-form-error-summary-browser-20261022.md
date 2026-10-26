# AutoForm / ErrorSummary 浏览器关联

## 范围

- parent/source：`../evaluations/enterprise-ui-plan.md` FormField/ErrorSummary、
  AutoForm 统一表单验收；用户持续推进企业级规范。
- 范围：enterprise fixture 中两个同构 AutoForm 实例的帮助文本、字段错误、
  ErrorSummary 键盘跳转、提交成功和实例隔离。
- 非目标：真实后端、真实权限、读屏软件认证、发布或部署。
- 协作：medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 证据

- 组件专项：在 `packages/ui` 执行
  `bunx vitest run src/components/auto-form-accessibility.test.svelte.ts`，
  **47/47 通过，退出 0**。
- 浏览器专项：在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.autoform.config.ts`，
  Chromium/WebKit/Firefox × 1440x1000/390x844，普通字段 **6/6**、数组复合字段
  **6/6**，合计 **12/12 通过，退出 0**。
- 每个表单均验证字段帮助与错误的组合描述、首错自动聚焦，以及从首错控件
  通过 Shift+Tab 回到摘要，再用 Enter 跳转指定字段。macOS WebKit 使用
  Alt+Shift+Tab；普通 Shift+Tab 首跑有两项未聚焦按钮，未改变系统或组件设置。
- 两个实例同时验证错误引用不跨表单、fixture 内 ID 不重复、引用目标存在；
  第一个表单修正后成功计数为 1 且载荷精确，第二个表单仍保留两项错误。
- 最终所有浏览器场景无 `pageerror`。
- 数组场景发现并修复 ArrayField 内部 UI Symbol 污染 Core 纯数据草稿的问题：
  `AutoForm` 入口现在仅剥离本组件定义的两个内部标记，保留 Core 对未知
  Symbol、访问器、循环和其他非法数据的拒绝。数组专项 23/23、复合焦点专项
  14/14 通过，数组回调的原始对象引用和 `structuredClone` 契约保持。
- 初步误判为必填契约导致草稿失败，经复验与源码检查否定，fixture 原始严格
  Schema 已恢复。直接移除标记、改发响应式数组的两种尝试因身份/原始引用
  回归而撤回，未保留。中断的浏览器运行不算通过。
- 复核进一步发现仅剥离标记会让 Core 快照丢失行身份；AutoForm 增加以本次已接受
  权威快照精确引用为归属的 UI 回显缓存，新权威快照自动使缓存失效，不按内容
  相等复用。浏览器改为逐字符键盘输入并验证焦点与完整值，最终仍为 12/12。
- 适配器遇到反射异常返回原值交给 Core 归一化拒绝；测试确认未知 Symbol、
  访问器（不执行 getter）、循环和反射异常仍被纯数据边界拒绝。
- 额外表单契约单文件 `form-contract.test.svelte.ts`：101/101，通过局部类型检查。
- 初版普通字段的 Bohr 只读复核无阻断；数组适配复核发现的行身份与反射异常
  问题已按上文修正，不能将初版结论当作生产修复最终审查。
- 最终 Bohr 复核确认此前两项 P2 已关闭，未发现 P0/P1 或已确认的缓存越界缺陷；
- 真实 AutoForm/Core 路径新增 Provider 替换和资源 scope 替换场景：
  三引擎两视口共 **12/12**，不卸载组件，旧数组行节点被移除、旧焦点不复用，
  新草稿可提交。此前的普通/数组交互 12/12 与本专项合计 24/24。
- Core 约定同一作用域改变 `defaultValues` 不覆盖编辑草稿，因此未将其错误标成
  reset 验收；同一作用域外部刷新保留草稿的语义也不应被 UI 缓存测试改写。
- 仍未覆盖真实 AutoForm/Core 路径下显式 `form.reset()` 的专项浏览器断言；
  当前 AutoForm 公开 UI 没有直接 reset 命令入口。
- Bohr 对本轮作用域专项只读复核未发现新增阻断，确认没有 keyed 重挂载，
  旧节点断开、新节点与精确载荷断言有效。当前专项是 create 模式，不覆盖
  edit 模式 `getOne`/query refetch 或迟到响应隔离。
- 该边界随后已补齐：edit 模式真实 `getOne` 延迟读取在资源 scope/Provider
  切换后分别验证迟到成功与迟到失败，三引擎两视口共 **24/24**；同作用域
  `refetch` 在未提交文本与数组行草稿存在时验证保持本地值，**6/6**。
  edit fixture 使用真实 `getOne`、`QueryClient.refetchQueries` 和未卸载的
  AutoForm，不直接调用内部 form API。
- 因此本轮 AutoForm 专项最终浏览器结果为 **54/54**：
  普通/数组交互 12、scope/provider 缓存失效 12、edit 迟到响应 24、
  dirty refetch 6。
- 完整专项命令实际退出 0，54/54；随后按只读复核建议增加
  `refetchQueries()` Promise 完成计数，再单独复验 dirty refetch 6/6，
  不把这六项算成新增场景。
- 迟到场景明确先等新记录显示和 readCount=2/pending=1，再修改新草稿并释放
  旧请求；两实例值、错误隔离和精确 update 载荷均检查。dirty refetch 使用
  旧 elementHandle 验证输入仍连接，而不是只重新定位输入检查文本。
- Bohr 静态复核未发现确定的 P0/P1/P2 阻断；建议的 QueryClient 完成等待已补。
  初版误在读取完成前断言 form 存在导致六项失败；另一次配置 grep 未匹配新
  场景导致 No tests found，均已修正且不计入通过证据。
- `git diff --check` 通过。

## 边界

### 2026-10-24 复合控件增量

- managed：pi 为测试实现 writer，主线程审查与独立执行。仅扩展既有
  `AutoFormAccessibilityFixture.svelte`、`browser.spec.ts` 与
  `playwright.autoform.config.ts`；未修改生产组件或 Provider API。
- Given 两份同构 create AutoForm，When 空提交并操作摘要，Then 首错聚焦实际
  控件，摘要键盘跳转仍留在所属表单，帮助/错误 IDREF 解析到所属表单活节点。
- Given 日期范围含 presets，When 摘要正反向 Tab/Enter 后选择 preset 并提交，
  Then preset/start/end 反馈一致、精确提交日期范围、另一份表单错误保留。
- Given 单选 TreeSelect，When Enter 打开、ArrowDown 到叶子、Escape 关闭、
  再打开并 Enter 选择，Then popup 引用及返回焦点正确，提交仅影响当前实例。
- Given Transfer，When 摘要跳转后用 Space 选 Administrator、Tab/Enter 转移，
  Then 提交 roles 为 `['admin']`，清错后帮助保留且另一实例仍 invalid。
- Cascader 增量使用 `changeOnSelect=true`，选择父级 East 后提交 `['east']`；
  独立复跑 6/6、exit `0`、12.4s，不证明默认叶子路径、懒加载或全部选择策略。
- 主线程独立验证三个新增场景分别为 6/6、11.0s；6/6、14.4s；6/6、12.2s，
  均 exit `0`（Chromium/WebKit/Firefox × desktop/narrow）。
- 最终共享 fixture 回归命令：
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep 'AutoForm (daterange|tree-select|cascader|transfer|array error)'`
  **30/30**、exit `0`、41.1s。包含四个新增场景与既有数组场景，不算新增 30 个场景。
- 改动前既有专项曾主线程复跑 54/54、exit `0`、53.0s；不把它与最终 30 项
  相加为最终全配置验收。此次未重跑最终完整配置、未发布、未部署。
- 不覆盖全部复合字段、原生日期内部分段 Tab、全部 Transfer/TreeSelect 选择策略、
  edit 复合字段、真实服务端或屏幕阅读器。窄视口仅有行为断言，没有新视觉验收。

本证据证明真实浏览器 DOM、反向 Tab 摘要路径及文本/数组基础交互，
不等于全部键盘路径、实际读屏、所有复合字段、真实权限、发布或部署。

### 2026-10-24 RichText AutoForm 增量

- 主线程独立命令：`bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep 'AutoForm richtext'`
- 结果：Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、20.9s。
- 真实两份 create AutoForm 验证首错自动聚焦正文 `contenteditable`，而不是前置工具栏 select；摘要到正文的反向/正向路径逐步检查同一表单内工具栏焦点，并验证两方向工具栏序列互为逆序；摘要 Enter 返回正文。
- 同时验证两个实例的 label/help/error 活 IDREF、清错后帮助保留、第二实例继续 invalid，以及精确 payload：`{"body":"<p>Rich body text</p>","name":"Rich product","description":"Ready with rich text"}`。
- `auto-form-compound-focus.test.svelte.ts` 主线程独立 **21/21**、exit `0`；覆盖顶层富文本正文优先、数组后置富文本不抢焦点、不可用正文回退到可用控件。
- 本轮后续修复：关闭 `StarterKit` 内置 `link`/`underline`，并将 `prosemirror-model` override/lock 升至 `1.25.12`；主线程再次复跑本场景 **6/6**，console 监听断言无 Tiptap warning。此前警告来自重复扩展注册与陈旧安装/Vite 预打包树，不能作为当前运行时结论。
- 依赖契约边界：`prosemirror-view@1.42.6` 的 `prosemirror-model` 要求为 `^1.25.12`；当前所有相关解析入口统一到 `1.25.12`。`.bun` store 中未被引用的历史目录不计入运行时加载。
- 本证据不覆盖真实读屏、完整编辑器扩展策略、真实 Provider/上传服务、发布、部署或移动端验收。

### 2026-10-24 B2-09 FileUpload 集成边界

- 只读核对链路：`FieldRenderer.svelte` 的 file 分支把 `UploadItem[]` 映射为
  `File`/`File[]` 传给 `onchange`；`AutoForm.svelte` 的 `fieldChange` 调用
  `form.setFieldValue`，再经 `contract-form` 的 `updateField` -> `draft` ->
  `snapshotContractFormDraft` -> `snapshotPlainData`。
- `snapshotPlainData` 只接受 JSON；临时内联验证 `new File(...)`、含 `File` 的
  对象和数组均抛 `TypeError: Invalid plain data`，未新增永久测试。
- 直接相关文件中没有可用的公开上传入口：`FileUpload` 的 `upload` prop 可返回
  `{ url?, uploadId? }`，但 `FieldRenderer`/`AutoForm` 不转发；`FieldDefinition`
  只有 `accept`/`maxSize`；contract-form 提交固定走 `snapshotPlainData(payload)`；
  原生 file input 的字段名不构成 multipart 提交通道，因为 AutoForm 的 `onsubmit`
  始终 `preventDefault`。
- 因此 file 选择会在 `fieldChange` 触发 `INVALID_RESOURCE_INPUT`，不会进入草稿；
  这是本地 AutoForm/FileUpload 集成缺口，不是单纯的外部上传服务未验证。
- 待用户决策：引入 multipart File 草稿/传输契约，或先上传取得引用 ID/URL 再以
  JSON 提交并定义 resolver。本轮不新增公开 API、不 JSON 化 File、不以禁用 file
  字段视为完成，也未修改生产代码或新增上传浏览器场景。
- 本记录不扩展上方错误摘要、键盘、浏览器矩阵或读屏结论。

### 2026-10-24 B2-09 tags AutoForm 浏览器增量

- managed，低风险；仅扩展既有
  `AutoFormAccessibilityFixture.svelte`、`browser.spec.ts` 与
  `playwright.autoform.config.ts`，未修改生产代码、公开 API 或 Provider。
- 主线程独立命令：
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep "AutoForm tags"`
  结果 Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、13.1s。
- 真实 create AutoForm 两实例：空提交后首错自动聚焦 tags 草稿输入框；摘要反向
  Tab 依次到 Description、Name、Tags，正向 Tab 逐项返回，Tags 摘要项 Enter
  回到草稿输入框。
- `aria-describedby` 的帮助与错误 token 均解析到所属表单内的活节点，两实例
  token 集合无交集；清错后仅保留帮助描述，错误关联消失。
- 在第一实例 tags 草稿输入框依次输入 `alpha`、`beta` 并按 Enter，生成两个
  `input[name="tags[]"]` 值 `['alpha', 'beta']` 且焦点保留在草稿输入框；补全
  Name/Description 后提交精确 payload：
  `{"tags":["alpha","beta"],"name":"Tagged product","description":"Ready with tags"}`。
- 第一实例清错后错误区消失、`aria-invalid` 归零；第二实例仍保持 3 项错误、
  Tags 摘要项和 `tags[]` 为空；全程 `pageerror` 为空。
- 全文件 `browser.spec.ts` lint 仍有既有 4 个 non-null assertion 错误，位于旧
  区域，不归因本轮 tags 改动；本轮不声称全文件 lint 通过。
- 边界：窄视口仅为既有响应式行为断言，不是移动端或视觉验收；不证明真实读屏、
  真实 Provider、RBAC、发布或部署。

### 2026-10-24 B2-09 multiselect AutoForm 浏览器增量

- managed，低风险；仅在既有 `browser.spec.ts` 末尾追加场景，fixture 与
  `playwright.autoform.config.ts` 中 multiselect 分支已存在；未修改生产代码、
  公开 API 或 Provider。
- 主线程独立命令：
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep "AutoForm multiselect"`
  结果 Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、12.2s。
- 真实 create AutoForm 两实例：`Labels` 使用 `role="group"`，组内 3 个 checkbox
  为 Alpha/Beta/Disabled；空提交后首错自动聚焦 Alpha，Disabled 保持 disabled
  且未选中。
- 组 label/description 与每个 checkbox 的 `aria-describedby` token 均解析到
  所属表单内的活节点；组与 checkbox 的错误描述一致，两实例 token 集合无交集。
  清错后组与 checkbox 仅保留帮助描述，`aria-invalid`/`data-invalid` 收敛。
- 摘要反向 Tab 依次到 Description、Name、Labels，正向 Tab 逐项返回；Labels
  摘要项按 Enter 回到 Alpha。
- Alpha 按 Space 选中，Beta 与 Disabled 未选中，生成单个
  `input[name="labels[]"]` 值 `alpha`；补全 Name/Description 后提交精确 payload：
  `{"labels":["alpha"],"name":"Labelled product","description":"Ready with labels"}`。
- 第一实例清错后成功计数为 1、错误区消失；第二实例仍保持 invalid、Labels
  摘要项存在且 `labels[]` 为空；全程 `pageerror` 为空。
- 全文件 `browser.spec.ts` lint 仍有既有 4 个 non-null assertion 错误，位于旧
  区域，不归因本场景；本轮不声称全文件 lint 通过。
- 边界：窄视口不是移动端或视觉验收；不证明真实读屏、真实 Provider、RBAC、
  发布或部署。

### 2026-10-24 B2-09 images AutoForm 浏览器增量

- managed，低风险；pi 在既有 enterprise fixture 三个测试文件之外，补充最小生产修复
  `packages/ui/src/components/FieldRenderer.svelte`，为 images 的
  add/update/remove 增加 `disabled` 守卫；Add image、Remove image 与 URL input 的
  help/error `aria-describedby` 及 `aria-invalid` 关联已补齐，禁用态保留回显但所有
  入口不改值。
- 主线程独立复跑 `field-renderer-advanced.test.svelte.ts` **24/24**、exit `0`。
  images 用例断言 IDREF 必须解析到活节点（不再允许空 IDREF 通过）、同业务 key
  双实例隔离、错误/说明动态清理，以及禁用态点击/输入不触发 `onchange`、恢复后
  add/update/remove 回调与隐藏值正确。
- 主线程独立命令：
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.autoform.config.ts --grep "AutoForm images"`
  结果 Chromium/WebKit/Firefox × desktop/narrow **6/6**、exit `0`、13.6s。
- 真实 create AutoForm 两实例：空数组提交后首错自动聚焦真实 `Add image`
  按钮，摘要实际文案为 `Images: Invalid format`；摘要项反向 Tab 到
  Description、Name，正向 Tab 逐项返回，Enter 回到 `Add image`。
- 在 URL 输入框填入 URL 并触发 `Add image` 生成 `images[]` 值；点击对应行
  `Remove image` 可移除，焦点与按钮身份保持可解析；空列表保存时 `Add image`
  同时关联说明与宿主错误节点，且所有 token 均 `connected` 且属于本表单。
- 每个 URL 输入与 `Add image`/`Remove image` 按钮的 help/error
  `aria-describedby` token 均解析到所属表单内的活节点，双实例 token 集合无
  交集；动态清理后仅保留说明关联，隐藏 `images[]` 与精确 payload 已断言。
- 第一实例清错后可提交，第二实例仍保持 invalid 与 `Images: Invalid format`
  摘要项；全程 `pageerror` 为空。
- 旧 `browser.spec.ts` 仍有 4 个既有 non-null assertion lint 错误，位于旧区域，
  不归因本轮 images 改动；本轮不声称全文件 lint 通过。
- 边界：窄视口仅为既有响应式行为断言，不是移动端或视觉验收；不证明真实图片
  上传/存储、Provider、RBAC、真实读屏、发布或部署。
