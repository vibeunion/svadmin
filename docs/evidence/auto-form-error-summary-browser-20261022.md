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

本证据证明真实浏览器 DOM、反向 Tab 摘要路径及文本/数组基础交互，
不等于全部键盘路径、实际读屏、所有复合字段、真实权限、发布或部署。
