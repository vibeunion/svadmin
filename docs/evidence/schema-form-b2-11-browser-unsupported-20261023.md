# B2-11 不支持 Schema 的真实浏览器拒绝证据（2026-10-23）

## 范围

续接 `schema-form-b2-11-boundary-audit-20261023.md` 与
`schema-form-unsupported-schema-20261022.md`，补 B2-11 的本地浏览器证据：
在不支持关键字被拒绝时，真实 `JsonSchemaForm` 是否在浏览器中保持关闭，
以及外部引用是否被拒绝且不触发远程请求。

本轮只新增测试 fixture、专属 spec/config 和本证据，更新矩阵 B2-11。
未修改 `JsonSchemaForm.svelte`、生产 UI、Core、Lite、Provider/RBAC；浏览器测试宿主
`App.svelte` 增加专属路由分支；
未实现 `$ref` / `oneOf` / 外部引用解析；未提交、未构建分发包、未部署。
pi 浏览器补测阶段未重复运行既有单测；主线程独立结果见下文。

## 新增文件与复用关系

- `scripts/fixtures/enterprise-ui/SchemaUnsupportedFixture.svelte`：四种
  unsupported schema 场景，直接复用真实
  `packages/ui/src/components/JsonSchemaForm.svelte`，不复制表单实现。
- `scripts/fixtures/enterprise-ui/App.svelte`：仅增加
  `?view=schema-unsupported` 分支。
- `scripts/fixtures/enterprise-ui/schema-unsupported.spec.ts`：本轮专属浏览器用例。
- `scripts/fixtures/enterprise-ui/playwright.schema-unsupported.config.ts`：本轮专属
  config，复用 `playwright.task-list.config.ts` 的 webServer，三引擎两视口。

## 四种场景

| case | Schema 输入 | 期望 |
| --- | --- | --- |
| `internal-ref` | `properties.field.$ref = '#/$defs/name'` + `$defs` | 拒绝，表单关闭 |
| `external-ref` | `properties.field.$ref = 'https://schemas.example.invalid/external.json#/name'` | 拒绝，表单关闭，零远程请求 |
| `one-of` | `properties.choice.oneOf = [...]` | 拒绝，表单关闭 |
| `unknown-keyword` | `properties.field.format = 'email'` | 拒绝，表单关闭 |

## 浏览器断言

`24 passed (24)`，chromium / webkit / firefox × desktop(1440×1000) /
narrow(390×844)，每个 case 均断言：

1. 真实表单渲染 `role="alert"` 且文案为 `Check the form input.`。
2. 表单内 `input, select, textarea` 数量为 0；未禁用且未只读的可编辑控件为 0。
3. `Submit` 按钮处于 disabled。
4. 手动派发 `SubmitEvent('submit')` 并调用 `form.requestSubmit()` 后，
   `unsupported-submissions` 仍为 `0`，没有业务 `onsubmit` 回调。
5. 页面无 `pageerror`。
6. `external-ref` 使用 `page.route('https://schemas.example.invalid/**', ...)`
   拦截并计数；测试结束断言远程请求计数为 `[]`。路由只计数/兜底返回，
   没有实际访问远端。

每个场景都注册同一 `page.route` 拦截并断言远程请求计数为空；其中
`external-ref` 的 schema 指向该远端域名，其余场景用于旁证没有额外加载。
路由只计数/兜底返回，没有实际访问远端。

## 验证命令与结果

```bash
cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.schema-unsupported.config.ts --reporter=line
```

结果：`24 passed (22.9s)`，原始退出码 `0`。

```bash
git diff --check
```

原始退出码 `0`。

本轮未运行既有 61/61 单测、其他浏览器 spec、构建、发布或部署。

### 主线程独立复核

- Schema 单文件：**61/61、exit 0、10.75s**，既有 source map 缺失警告未导致失败。
- 专属浏览器：**24/24、exit 0、23.2s**，命令：
  `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.schema-unsupported.config.ts --trace retain-on-failure --output output/playwright/schema-unsupported-review-20261023`。
- `git diff --check`：exit 0。以上与 pi 的 24/24、22.9s 分开记录。
- 网络计数仅证明测试观察窗口内未请求 fixture 指定域名，不是任意时间、
  任意目的域名的网络安全认证。

## 结论与边界

- 本轮把 B2-11 的“不支持 Schema 拒绝”从单测扩展到本地真实浏览器证据；
  矩阵中的“浏览器表现”由外部依赖改为已独立复核的本地证据。
- 它只证明拒绝行为：`$ref`、`oneOf`、外部引用和未知关键字不会被静默降级，
  不会被当作已校验数据提交，外部引用不会发起远程加载。
- 它不是引用适配证据，也没有实现引用解析、分支选择、远程加载策略或公开
  Schema 错误 API；完整受控引用适配仍需产品/安全契约。
- 读屏/辅助技术行为仍未在本轮验证，仍属外部依赖。
- 仅新增 fixture/spec/config/证据并更新矩阵 B2-11；未改生产/Core/Lite，
  未 commit/push/deploy。
