# 保存视图失效字段提示 DOM/浏览器续接验收（B3-02）

## 续接契约

- parent: `saved-view-stale-fields-20261024.md`
- source: 用户继续直到全部完成
- reason: 新增提示需要真实消费者（AutoTable + 受控 Provider）浏览器验收，模型层单测不足以证明 DOM 生命周期。
- orchestration: managed，medium；本任务唯一 writer，主线程只读审查。
- goal: 在真实浏览器中验证失效字段提示的显示/计数、应用后 provider 查询有效性、删除与按名覆盖后的精确清除，以及加载/应用不写存储。
- non-goals: 不改生产组件、`AutoTable.svelte`、i18n 或现有 spec / base 配置；不验证真实后端版本冲突、RBAC、租户隔离；不提交、推送、发布或部署。

## 变更文件

- `scripts/fixtures/enterprise-ui/SavedListViewsFixture.svelte`：仅新增 `seed=stale` 参数，返回两个受控远端视图，各自含一个不同的失效列（`retiredOwner` 来自 `columnVisibility`，`legacyTeam` 来自 `columnOrder`）。默认行为与 `seed=remote` 不变。
- `scripts/fixtures/enterprise-ui/saved-view-stale-fields.spec.ts`：新增两个真实消费者场景。
- `scripts/fixtures/enterprise-ui/playwright.saved-view-stale-fields.config.ts`：专属配置，三引擎（chromium/firefox/webkit）× desktop/narrow，独立端口 `4223`，`strictPort` 且 `reuseExistingServer: false`。
- 本文件：浏览器验收证据。

## 场景与断言

1. 无失效字段（`seed=remote`）：打开视图弹层后 `role=status` 为 0，两个远端视图均可见，且无 save/remove 写入。
2. 两个失效字段（`seed=stale`）：提示以 `role=status` 出现，文案计数为 2。spec 内的中英文双写 regex 只是容错匹配，**不等价于同引擎双 locale 验收**；本矩阵未注入 `locale`，各引擎按自身默认语言运行，实测结果见下方“运行语言”。
3. 真实 UI 应用：依次通过视图选择控件应用两个视图，`saved-list-views-query-calls` 的 filters/sorters/pagination 与搜索词对应的有效 provider 查询完全一致。
4. 加载/应用不改存储：应用后 localStorage 无 `svadmin-list-views-v2-*` 写入，provider 的 save/remove 日志为空，列表读取仍只有 1 次。
5. 真实删除：删除前先将删除按钮、失效提示与弹层一并纳入 narrow 几何断言；随后用键盘（`focus()` + `Enter`）激活 `Delete Stale visibility view`，提示计数 2→1；remove 载荷精确等于 `{ type: 'remove', input: { id: 'stale-visibility-view', expectedVersion: 4 } }`。
6. 按名覆盖：选择 team 归属、填入同名 `Stale order view`，用键盘（Enter）保存；提示 2→1→0，视图不重复。save 载荷精确等于 `expectedVersion: 7`、`source: 'team'`、`state.search: 'stale-order'`、`columnOrder: ['team','id','email']`、`columnVisibility: {}`，序列化后不含 `legacyTeam`。
7. narrow：删除**前**断言提示、弹层、`Delete Stale visibility view` 删除按钮、视图选择、名称输入与保存按钮均在视口内，且 `documentElement.scrollWidth <= innerWidth`。
8. 全部场景监听 `pageerror`，断言为空；禁止 `force` 与 DOM 点击（打开弹层、删除、保存均为 `focus()` + 键盘 `Enter`，视图应用走原生 select）。前两个场景的激活路径只证明控件可达且可被键盘激活，不单独证明完整焦点顺序。
9. 真实键盘遍历（`seed=stale`）：Views 按钮 `focus()` 后按 `Enter` 打开，等待组件自动聚焦到 `View ownership`。正向使用平台键盘规则（macOS WebKit 为 `Alt+Tab`，其余为 `Tab`）有界遍历，实际经过 current view → name → `Set as default view Stale visibility view` → `View visibility Stale visibility view` → `Delete Stale visibility view`，并回到 `View ownership`；反向使用 `Alt+Shift+Tab`/`Shift+Tab` 从 ownership 到达最后一个 `Delete Stale order view`；最后 `Escape` 关闭弹层且焦点回到 Views 触发按钮。场景不直接 focus 内部控件、不使用 `force`、不使用 `evaluate` 修改焦点，也不假设弹层是模态或焦点陷阱。

## 运行语言

本矩阵未设置 `use.locale`，因此语言由各引擎默认值决定。以同一 fixture（`seed=stale`）做只读探测，读取 `navigator.language` 与提示原文：

| 引擎 | `navigator.language` | 提示原文 |
| --- | --- | --- |
| chromium | `en-US` | `Ignored 2 unavailable field(s): columns that no longer exist in this resource are not applied.` |
| firefox | `en-US` | 同上（英文） |
| webkit | `zh-CN` | `已忽略 2 个失效字段：资源中已不存在的列不会应用到当前视图。` |

因此本矩阵实际覆盖的是“各引擎默认语言下的文案”，spec 在运行时通过 `testInfo.attach('fixture-runtime-locale.json')` 记录当时的 locale 与提示原文（输出保留时可查）。**未做**同一引擎内 `en`/`zh` 双 locale 独立验收，也未断言切换语言后的行为。

## 执行结果

```text
$ cd scripts/fixtures/enterprise-ui
$ npx playwright test --config playwright.saved-view-stale-fields.config.ts
Running 18 tests using 1 worker
18 passed (21.4s)
exit 0
```

覆盖矩阵：`chromium-desktop`、`chromium-narrow`、`firefox-desktop`、`firefox-narrow`、`webkit-desktop`、`webkit-narrow`，每个 3 个场景，共 18 项全通过。新增键盘场景在 6 个项目均通过，包括 macOS WebKit 的 `Alt+Tab` / `Alt+Shift+Tab` 路径。

```text
$ npx eslint scripts/fixtures/enterprise-ui/saved-view-stale-fields.spec.ts \
    scripts/fixtures/enterprise-ui/playwright.saved-view-stale-fields.config.ts \
    scripts/fixtures/enterprise-ui/SavedListViewsFixture.svelte
exit 0（无输出）

$ git diff --check -- scripts/fixtures/enterprise-ui/SavedListViewsFixture.svelte
exit 0
```

以上为 pi 自测。新增键盘场景前的 12 项历史结果为：

```text
Running 12 tests using 1 worker
12 passed (17.6s)
exit 0
```

主线程独立复核定向 ESLint `exit 0`、`git diff --check` `exit 0`，并抽查
`webkit-narrow-two-stale-fields.png`：提示、视图选择、名称输入、保存和删除控件
均在 390×844 视口内，页面无横向溢出。

## 截图（仅落忽略目录 `scripts/fixtures/enterprise-ui/output/`）

目录：`scripts/fixtures/enterprise-ui/output/playwright/saved-view-stale-fields-browser-20261024/`，共 18 张（6 项目 × 3 状态）：

- `*-no-stale-fields.png`
- `*-two-stale-fields.png`
- `*-stale-cleared.png`

其中 `*-narrow-*.png` 为窄视口（390×844）截图，用于提示与弹层控件边界检查。

## 限制与边界

- 远端存储为受控内存 Provider（`SavedListViewsFixture.svelte`），`list` 返回克隆；不能据此推断真实服务端版本冲突、权限过滤或持久化语义已验收。
- 键盘证据覆盖 Views 触发 → 自动聚焦 ownership → 正向遍历 → 反向到最后控件 → Escape 返回触发器的真实路径；未覆盖所有组合键、屏幕阅读器实际播报或焦点陷阱实现细节，也不把弹层声明为模态。
- 文案证据仅覆盖各引擎默认 locale 下的运行结果，未做同引擎 `en`/`zh` 双 locale 独立验收。
- 未运行全量测试、全量 typecheck、既有 `saved-list-views.spec.ts` 或基础 Playwright 配置；结论限于本专属单 spec 矩阵与定向 eslint/diff。
- 未修改生产组件；若后续主线程期望提示文案/位置调整，属于新的生产变更，不在本轮范围。

## B3-02 续接探测历史：默认 Tab 路径（平台限制，非已确认产品 bug）

- 范围：只读检查 `AutoTable.svelte` 的 Views `Popover` 与 `bits-ui` `Popover.Content`，并用临时 Playwright 脚本对真实 fixture 做只读探测；该历史探测未改生产组件，也未改 `saved-view-stale-fields.spec.ts`。
- 方法：`seed=stale`，`focus()` Views 按钮后按 `Enter` 打开弹层，等待弹层可见并静置 400ms；随后读取 `document.activeElement`，连续按 `Tab` 12 次、再重新打开后按 `Shift+Tab` 3 次。每个项目重复 2 轮。未用 `evaluate` 直接改焦点，未用 `force`。
- 覆盖：chromium / firefox / webkit × desktop 1440×1000 / narrow 390×844，共 6 项目。

| 项目 | 打开后初始焦点 | 正向 `Tab` 实际路径 | 是否离开弹层 | `Shift+Tab` |
| --- | --- | --- | --- | --- |
| chromium-desktop / chromium-narrow | `View ownership` select（弹层内） | ownership → current view → name → set-default → access → delete，循环回 ownership | 否 | 回到弹层内最后一个 delete 按钮 |
| firefox-desktop / firefox-narrow | 同上 | 同上，稳定循环 | 否 | 同上 |
| webkit-desktop / webkit-narrow | 同上 | 只到 ownership → current view → name → 两个 access select；按钮不进入正向 Tab 序列 | 是：最后一个 select 后 `Tab` 落到 `BODY`，随后在 `BODY`/最后一个 select 间交替 | 回到弹层内最后一个 delete 按钮 |

更正说明：打开的自动聚焦是组件预期行为，**不再将“打开后焦点已在 ownership”推断为不稳定**。上表只说明 macOS WebKit 在宿主未启用全键盘访问时，原生 `Tab` 默认跳过按钮并可能把焦点落到 `BODY`；这是平台键盘规则限制，不是已确认的产品缺陷。仓库既有 `browser.spec.ts` 对 macOS WebKit 使用 `Alt+Tab` / `Alt+Shift+Tab` 遍历全部控件，本 spec 现按同一平台规则新增真实场景，未把默认 `Tab` 行为写成产品缺陷，也未修改生产组件。

## 真实键盘遍历场景（pi）

- 新增用例：`SavedView stale popover keeps real keyboard traversal and returns focus to the trigger`。
- 平台规则：`browserName === 'webkit' && process.platform === 'darwin'` 时正向 `Alt+Tab`、反向 `Alt+Shift+Tab`；其余平台为 `Tab` / `Shift+Tab`。
- 打开与自动聚焦：Views `focus()` + `Enter`，随后 `expect(ownership).toBeFocused()` 等待稳定；不要求先按一次 `Tab` 才进入弹层。
- 正向：有界遍历依次命中 current view、name、默认按钮、access 选择、删除按钮，并回到 ownership。
- 反向：从 ownership 反向一次命中弹层最后一个控件 `Delete Stale order view`。
- 关闭：`Escape` 后弹层隐藏，焦点回到 Views 触发按钮。
- 约束：未直接 focus 内部控件，未使用 `force`，未使用 `evaluate` 修改焦点；仅用只读 `document.activeElement` 比较判断目标是否已聚焦。测试断言的是该 fixture 的真实可访问顺序，不额外推断弹层具备模态语义。

主线程已审查平台分支和有界按键遍历实现，并独立复跑最终专属配置：
**18/18 passed，exit 0，22.9s**。定向 ESLint 与 `git diff --check` 均 exit 0。
该结果包含新增键盘场景，替代前述 12 项阶段结果作为当前矩阵证据。
有界遍历证明关键控件按序可达，不证明每次 Tab 的全量中间焦点轨迹或屏幕阅读器播报。

## 新增键盘场景前的矩阵历史复跑（pi）

```text
$ cd scripts/fixtures/enterprise-ui
$ npx playwright test --config playwright.saved-view-stale-fields.config.ts
Running 12 tests using 1 worker
12 passed (16.2s)
exit 0
```

该历史复跑无新增场景，故当时矩阵仍为 12 项；当前矩阵已扩展为 18 项，以上只保留为新增键盘场景前的回归记录。
