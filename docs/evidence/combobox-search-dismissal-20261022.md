# ComboboxField 关闭搜索生命周期

## 续接约定

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二异步选择器；
  source：用户本轮限定 ComboboxField 关闭搜索生命周期；reason：关闭弹层
  时仍可能执行未到期的搜索 debounce，重开后保留旧查询、旧分页或旧搜索
  输入，缺少统一的关闭清理契约。
- scope：只处理 `ComboboxField` 的关闭清理、重开首屏、旧响应隔离和搜索
  在途可选性；保留多选已确认值，不改变宿主 `value`/`onchange` 协议。
- 非目标：不承诺取消外部 Provider 的网络请求，不宣称请求已 `Abort`；
  不覆盖真实 Provider/授权、读屏认证、完整交互矩阵或发布验收。
- 写入范围：`ComboboxField.svelte`、`combobox-field.test.svelte.ts`、
  `ComboboxFixture.svelte`、`combobox.spec.ts`、本证据和计划追加段落。
- Delegation Decision：medium / managed；主线程唯一 writer，用户只读审查，
  确定性单文件测试、专属浏览器矩阵和 `git diff --check` 作为证据门禁。
- 风险：medium；涉及组件公开交互、分页缓存与迟到响应，不涉及数据迁移、
  权限或生产写入。

## 关闭契约

```gherkin
Given 搜索输入尚未超过防抖窗口
When 通过 Escape、触发器、焦点离开、外部点击或禁用关闭弹层
Then 取消未执行的 debounce，不发起旧搜索，不调用 onchange

Given 字段已确认单选或多选值
When 关闭后重新打开
Then 搜索输入为空、回到空搜索第一页，宿主 value 和多选已确认值保持不变

Given 搜索请求仍在途
When 用户输入新词、清空输入或关闭重开
Then 旧结果不可选择或不可见，清空后恢复空搜索，迟到旧响应不能覆盖新结果
```

实现将关闭统一收敛到 `closeMenu` → `resetSearch`：清理 timer、清空
`searchInputValue`/`appliedSearch`、`page` 回到 1、丢弃累计的 `loaded`
选项；Escape、触发按钮、focusout、外部点击和 disabled 均由该路径清理。
延迟 `apply` 额外校验弹层仍打开、输入值仍匹配、作用域未变且未禁用。
迟到响应继续由查询 key 和 `loaded` 的 scope/search 匹配隔离，不修改
Provider 或网络层。

## 红绿结果

- 首轮红测：`combobox-field.test.svelte.ts` **7 failed / 34 passed**。
  其中 1 项是新增测试自身的 `Filter` 联合类型收窄错误，修正测试类型后，
  产品侧红测为 6 项：5 条关闭路由在关闭后仍把待执行搜索发给 Provider
  或重开后保留旧输入，以及已执行的多页搜索在重开后恢复旧搜索。
- 修复后：同一单文件 **42/42 passed**，包含原有严格 TypeScript 编译测试、
  局部类型测试和原有回归；未弱化既有断言。
- 多页重开测试的首次绿色运行暴露了测试错误地要求缓存查询重新发起请求；
  已改为先断言重开界面回到空搜索第一页，再真实点击 Load more 并断言
  下一次请求为空搜索第 2 页，未放宽分页或关闭断言。
- 浏览器专属矩阵：

  ```sh
  cd scripts/fixtures/enterprise-ui
  bunx playwright test -c playwright.combobox.config.ts --max-failures=1
  ```

  结果 **24/24 passed**：Chromium、WebKit、Firefox × 1440px 桌面、390px
  窄屏 × 4 场景。fixture 使用真实分页（`fetchSize=10`、多页数据）和
  受控慢搜索（旧搜索延迟 1200ms 后返回并计数），全部通过公开输入框、
  触发器、Load more、Escape 和选项执行真实输入、关闭、重开与选择。
- 浏览器首次尝试通过 fixture 按钮释放旧请求，按钮点击本身触发了
  focusout/外部点击关闭，导致场景无效；改为延迟旧响应并用计数器确认
  响应时点，没有使用强制 focus 掩盖焦点问题。
- `git diff --check` 通过。未运行全仓测试、typecheck、build 或发布。

## 边界

本地 DataProvider stub 只证明组件契约和真实浏览器交互，不证明外部真实
Provider 的请求取消、超时、服务端查询一致性、权限/租户联调、读屏认证
或发布部署。本轮不宣称网络请求已 `Abort`，只保证组件关闭后不执行未到期
的搜索 debounce，并隔离迟到旧结果。
