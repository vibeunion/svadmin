# B2-05 异步选择：真实取消、超时、分页虚拟化与 AutoComplete

## 续接约定

- parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B2-05。
- source：矩阵下一动作要求补真实 `AbortSignal`、超时、大数据虚拟化和独立 AutoComplete 入口。
- scope：只改 `packages/core/src/select-query.svelte.ts`、`packages/core/src/query-session.svelte.ts`、`packages/ui` Combobox/AutoComplete 及其专属单测、Playwright fixture/spec 和本证据。
- 非目标：不改 Provider 协议、RBAC/租户实现、网络层、发布包或全仓重构。

## 实现边界

- `createSelectQuery` 的 list/default 两类查询接收 TanStack 查询 signal，并在派发 Provider 前附加到查询参数；新查询派发时中止同类旧请求，卸载或显式 `cancel()` 时中止仍活动的请求。
- 共享同 key 请求的取消判定不再只看 `observers <= 1`。清理延后到 Svelte 完成 observer/key 切换后执行：已卸载或已切到新搜索/作用域时，仅在旧 key 已无 observer 时中止；同 key 显式 `cancel()` 时，本 observer 仍计入数量，只有独占请求才中止。因此 A 取消、卸载或搜索切走后不会误中止仍由 B 使用的同 key 请求；最后消费者离开时仍会真实 abort。
- 新增可选 `requestTimeout`。超时以公开的 `SELECT_REQUEST_TIMEOUT`（504）失败并中止 Provider signal；取消以公开的 `SELECT_REQUEST_CANCELLED`（409）失败。两者是本地 select 错误码，已加入 `querySessionError` 的公开 code 白名单，不会透传 Provider 诊断；没有伪造服务端取消能力，Provider 若不响应 signal，UI 仍靠既有 session/scope 隔离拒绝迟到结果。非法 timeout 在派发 Provider 前以 `INVALID_RESOURCE_INPUT` 拒绝。
- `ComboboxField` 新增 `requestTimeout`、`virtualized`、`itemHeight`、`viewportHeight`。候选达到 200 行后窗口化渲染，保留分页、`Load more`、选中回显和错误 retry；Home/End、ArrowUp/ArrowDown 和 Enter 基于完整候选数组导航，跨窗口时同步滚动并维护 `aria-activedescendant`。
- 新增公开 `AutoComplete` 单值输入入口，复用同一 select-query 语义，支持搜索、分页、键盘选择、Escape 回显、取消和超时；搜索防抖期间及在途旧候选不可选，外部 value 清空和公开 clear `null` 会同步输入回显，关闭菜单会清除 debounce timer 并中止在途请求，窗口外 active 项会失效。不包含多选、自由标签或服务端自动补全协议。
- 权限、tenant、provider、contract 和 auth session 仍在 source scope 内 fail-closed。本地 `AuthProvider.logout`/`useLogout` 只证明浏览器 UI 会话隔离，不是 RBAC、租户授权或真实服务端撤销；关闭该证据不能声明权限系统已完成。

## 验证

- 单测按相关文件分开执行：
  - `src/components/select-contract.test.svelte.ts`：77/77 passed、exit 0；覆盖 list/default 两族共享同 key 请求的 signal 捕获、A 取消/卸载/搜索后 `signal.aborted === false` 再 resolve 证明 B 成功、最后消费者离开时 `aborted === true`，以及公开超时 code。
  - `src/components/combobox-field.test.svelte.ts`：50/50 passed、exit 0；覆盖 1200 候选窗口化、End/Home/ArrowUp 跨窗口和 Enter 选中。
  - `src/components/autocomplete.test.svelte.ts`：15/15 passed、exit 0；覆盖防抖旧候选不可选、外部 value 清空、clear `null`、关闭清 timer/cancel、active 虚拟窗口一致，以及受控值重开后的正常改选。
- 红绿证据：新增“公开本地超时 code”单测先在旧实现失败（收到 `QUERY_FAILED`，期望 `SELECT_REQUEST_TIMEOUT`），将 `SELECT_REQUEST_CANCELLED/TIMEOUT` 加入公开 code 白名单后通过。
- 专属 Playwright：主线程独立运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.combobox.config.ts --workers=1`，3 引擎 × 2 视口，**78 passed、0 failed、exit 0、1.5m**。
- 浏览器场景覆盖：快速搜索旧请求不覆盖新结果且旧 signal 已 aborted；超时错误后清空搜索恢复；分页加载 1200 候选中用真实键盘 Home/End/连续方向键跨窗口导航并 Enter 选中；本地 auth session reset 后已确认标签和候选清空；AutoComplete 搜索、选择、回显、外部清空、公开 clear、Escape 恢复及受控值重开改选。
- `git diff --check`（本轮相关文件）exit 0。

## 仍未证明

- 真实 Provider/后端支持 AbortSignal、服务端取消、超时上限和真实 RBAC/租户撤销。
- 屏幕阅读器对窗口化列表和 AutoComplete 的实际朗读；本证据只覆盖 ARIA 属性与真实浏览器操作。
- 发布包消费、跨版本兼容和部署。
- AutoComplete 多选、自由文本提交、服务端建议排序等未纳入本轮最小公开 API。

## 主线程独立复核与过程记录

- 最终独立单文件运行：select-contract **77/77、17.55s**；Combobox **50/50、16.89s**；AutoComplete **15/15、6.29s**；色彩契约 **4/4、686ms**。各次 exit 0，不合并测试次数。AutoComplete 的严格组件类型转换已纳入 select-contract 的类型检查。
- 最后改选修复的 pi 红测为 **3 failed / 12 passed**，修复后 **15/15**。选中标签不是用户搜索草稿，组件以独立 `searchDraft`/`searchPending` 区分，保留防抖与在途禁止旧候选提交的守卫。
- pi 较早的 **54/54**、返修 **72/72** 属不同版本的自测，不能替代最终主线程 **78/78**。本次最终矩阵新增受控值首次改选、搜索选中后重开改选、Escape 恢复后改选。
- 一次 pi 返修进程以 `Invalid parameter JSON`、exit 1 终止；确认会话终止后才启动恢复执行，保留全部未提交改动。没有把中断阶段当作验收通过。
- `svelte2tsx/index.js.map` 缺失警告仍存在，单文件严格检查和测试退出码为 0。本轮未运行全仓构建、全量测试或生产验收，未提交、推送或部署；整体企业级目标仍未完成。
