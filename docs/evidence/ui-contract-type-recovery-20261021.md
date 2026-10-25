# UI 严格类型与页面示例契约收口

## 续接任务

- parent：`docs/evaluations/enterprise-ui-plan.md` 与数值绑定续接验收；
  source：用户在 2026-10-21 要求继续；
  reason：上一轮记录的 UI 包级类型错误仍阻挡当前严格检查。
- 目标：修复已复现的 6 个文件、10 项类型错误，同时保留状态反馈、
  审批控件关联和页面操作示例的行为契约。
- 非目标：不做全仓类型整改，不改公共 API、类型配置、依赖、主题、
  业务 Provider 或默认表格引擎；不提交、推送、发布或部署。
- 写入范围：SecurityLogPage、AuditTimeline、PagePatternExample，
  approval-action-card / builtin-safety-followup / primitive-recipe-defaults /
  audit-timeline / page-pattern 测试，以及本证据和计划入口。
- Delegation Decision：medium / managed；主线程唯一写入，
  Bohr 为一名独立只读 verifier。没有协调状态文件，不创建并行写入者。
- 执行状态：本地修复与专项验收完成，总路线图继续进行。上一轮数值绑定的
  结果保持历史记录，本轮不覆盖。

```gherkin
Given 安全日志先有记录，再筛选为零条
When 清除搜索
Then filtered-empty 状态退出并重新显示记录，不残留筛选提示

Given 审计时间线没有显式传入可选状态文案
When 切换加载、失败和空状态
Then 使用默认反馈，并保留调用者提供的重试与自定义文案

Given 同屏有两个审批卡片
When 分别打开审批弹窗
Then 两个意见字段都有不同的非空 id，标签分别关联正确字段

Given 列表页面示例展示一条记录
When 打开行操作并选择记录
Then 触发器只有一个原生按钮，该记录被选中且其它行不受影响
```

## 只读基线

- UI 包级 `svelte-check --tsgo-experimental-api --tsconfig packages/ui/tsconfig.json
  --threshold error`：10 errors / 0 warnings，6 个文件，退出 1。
  包括 2 个可选属性对象错误、3 个未收窄索引、4 个索引签名访问错误、
  1 个不受支持的 `asChild` 属性。
- `date-time-input.test.svelte.ts`：单文件 23/23，退出 0。
  此结果只确认已有用例，不代表日期组件完整验收。

## 当前结果

所有组件测试均在 `packages/ui` 使用现有配置逐文件执行：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/<文件>
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/primitive-recipe-defaults.test.ts
```

页面菜单新增回归在修复前明确失败：预期每行 1 个按钮，实际为 2 个。
随后只将示例的 `asChild` 改为现有 `child` snippet 并透传触发器属性，
原失败用例及其余页面用例通过。没有修改菜单公共实现或放宽编译选项。
两个状态组件沿用 `definedOptions`，省略未定义属性；新增断言确认清空搜索
和空态切换到无权限时不会残留旧提示。

- `date-time-input.test.svelte.ts`：23/23，退出 0。
- `time-date-picker.test.svelte.ts`：2/2，退出 0。
- `page-pattern.test.svelte.ts`：16/16，退出 0；覆盖单一菜单触发器、
  当前行选择、其它行不受影响和菜单关闭。
- `approval-action-card.test.svelte.ts`：4/4，退出 0；覆盖多卡片弹窗的
  唯一字段 ID 和 `label.htmlFor` 关联。
- `content/audit-timeline.test.svelte.ts`：9/9，退出 0；覆盖空、加载、
  筛选空、错误、无权限、重试、自定义文案及旧状态清除。
- `builtin-safety-followup.test.svelte.ts`：10/10，退出 0；覆盖安全日志
  筛选空与清空恢复。
- `primitive-recipe-defaults.test.ts`：14/14，退出 0。
- `bun x --no-install svelte-check --tsgo-experimental-api
  --tsconfig packages/ui/tsconfig.json --threshold error`：0 errors / 0 warnings。
- `git diff --check`：通过。
- 独立只读 verifier Bohr：未发现明确 P0/P1/P2 行为风险；未修改文件、
  未运行测试。

本轮仅完成本地组件和包级类型门槛恢复。没有完成完整应用/消费者构建、
跨浏览器与屏幕阅读器认证、真实 Provider/权限/持久化联调、提交、发布或部署；
不得把本文件视为整套企业级 UI 路线图的验收证明。
