# RelationPicker 搜索模式切换

## 续接契约

- parent: `relation-picker-dismissal-20261021.md`；source: 企业级工作流持续目标。
- goal: 搜索开关变化清理搜索、防抖、页码和结果累积，但不丢弃已选草稿。
- scope: RelationPicker、relation-picker 单文件测试、本文及路线图。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不更改 Provider、跨租户隔离规则、单多选语义或发布状态。

Given 选择器已有勾选项且搜索尚在防抖中，When 关闭搜索再恢复，
Then 搜索文本为空、没有迟到搜索请求、勾选草稿保留且可确认。

Given 搜索结果已经加载到第二页，When 关闭搜索，
Then 查询重置为第一页和空搜索条件，不提前请求旧页码的无搜索结果；
弹窗保持打开、草稿保留，重新启用搜索不恢复旧条件。

## 复核续接

- parent/source: 本文搜索模式修复 / Bohr 只读复核发现。
- reason: 字段比较遗漏 Provider 路由名，同对象别名切换未使草稿失效。
- scope: 仅补充作用域比较、测试 Host 的公开 Provider 输入类型与单文件回归；
  沿用 medium / managed 和唯一 writer，不改 Provider 实现或发布状态。
- Given 两个路由名指向同一 Provider，且契约与 meta 不变，
  When 宿主切换资源的 Provider 路由名，
  Then 关闭旧草稿、重新打开不恢复旧勾选、不触发 onchange。
- Bohr 再次只读复核确认该 P2 已关闭；未由复核者运行测试。

## 实现与证据

- scope 改为逐字段比较，避免无关属性更新产生新派生对象时误判身份变更。
  资源、契约、Provider 路由名与对象、权限、认证会话、租户、字段和查询参数
  仍参与比较。Provider 对象不变但 `dataProviderName` 改变时，也会清理草稿、
  页码与累积结果。
- searchable 使用独立同步状态；清理完成前禁用查询，避免 effect 前发出旧页请求。
- 最初清理实现的两例均失败；字段比较后仍有旧页请求，加入查询门控后通过。
  这不是对未修改旧版本的完整失败回放。
- `bunx vitest run src/components/relation-picker.test.svelte.ts`：26/26，
  包括原有权限拒绝、租户/Provider 切换、跨页选择和取消路径。
- 新增同一 Provider 对象挂载 `default`/`named` 两个路由的回归；移除
  `providerName` 比较后该用例失败，恢复后通过，证明回归能抓住本轮缺口。
- 本机 fixture 在 Chromium、WebKit 两种引擎、`1440x900` 与 `390x844` 两种
  视口分别覆盖 pending/applied 和 cached/fresh，共 16/16（每引擎 8/8），
  所有场景 `pageErrors: []`。cached 模式恢复第一页缓存，没有新请求；fresh
  模式确实重新读取 `page=1, search=""`，且 applied 场景断言请求数量大于零，
  不使用空数组的 every 结果证明重新读取。草稿保留为 Record 1，确认只提交一次。
  前一轮只有 cached Chromium 4/4，不能将其解释为重新读取成功。
  脚本和截图位于
  `output/playwright/relation-picker-dismissal-20261021/verify-search-mode.cjs`
  与同目录 `{chromium,webkit}-{cached,fresh}-{pending,applied}-{1440,390}.png`。
- 已查看 `mode-applied-390.png` 与 `webkit-fresh-applied-390.png`，窄视口的
  结果区、Load more、Confirm 和 Cancel 未发生遮挡；其他截图未逐张视觉审查。
- WebKit 使用本机已有匹配运行器，通过 PLAYWRIGHT_MODULE 指定；
  Chromium 通过 CHROMIUM_EXECUTABLE_PATH 指定已安装浏览器，未改仓库依赖。
- 仍未执行 Firefox、读屏或真实 Provider 验收；不将这两个浏览器引擎中的本地
  场景外推为整个产品跨浏览器或生产认证。
