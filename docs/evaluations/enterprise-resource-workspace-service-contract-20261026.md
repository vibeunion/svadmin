# ResourceOperationsPage/AutoTable 真实服务消费验收契约

- parent: `docs/evaluations/enterprise-autoform-postgrest-record-contract-20261026.md`
- source: 用户要求继续完整企业级目标，覆盖矩阵 B3-01 的单一真实
  `ResourceOperationsPage` / `AutoTable` 消费者链路；上一轮只完成 AutoForm 创建、
  重新编辑与跨租户读取，不包含列表查询、选择、详情 Drawer、快速编辑失败保留草稿、
  修正保存和列表刷新保持。
- reason: 既有 `ResourceWorkspaceFixture.svelte` 与 Playwright spec 使用的是内存
  provider 和预置失败开关，只证明 UI 生命周期，不证明真实 GoTrue 会话、
  `createSupabaseDataProvider`、PostgREST filters/pagination、PostgreSQL 约束拒绝
  与独立会话读回。本轮补齐浏览器工作台到真实服务的单一最小闭环。
- orchestration/risk: managed / medium；pi 为唯一实施 writer，主线程为独立
  verifier。无 `coordination.json` / agmesh CLI；以本契约记录范围、状态与边界。
- workspace: 仅当前隔离 worktree `enterprise-storage-acceptance/svadmin`；保留全部
  dirty 与共享 `node_modules` symlink。不修改原工作区，不提交、推送、发布或写生产
  状态。手工编辑使用 `apply_patch`。

## 范围

1. 新增一个专用 workspace fixture 与入口，唯一页面壳为当前 worktree 的
   `AdminApp`，在 dashboard 正常文档流中挂载真实 `ResourceOperationsPage` /
   `AutoTable` / `QuickEditDrawer` / `AutoForm`。不复制整套 runner、代理或安全
   helper，不改生产 API，不使用 fixed 遮挡或 force click。
2. 继续使用既有真实 GoTrue、PostgREST、PostgreSQL 与同源回环代理。测试进程只经
   既有 `createSupabaseAuthProvider` 登录与 `createSupabaseDataProvider` 读写；普通
   请求全部来自真实用户会话。service role 只用于可信租户 `app_metadata` 分配、
   最终清理与独立核查，不替代用户写流程。
3. 表结构沿用 `enterprise_acceptance.browser_records`。只在 runner SQL 增加一个
   明确 test-only 的 PostgreSQL CHECK 约束：非法 title sentinel 必须由真实用户
   PATCH 触发 `23514`。sentinel 不影响旧 13 项数据，也不作为生产业务规则。
4. 测试通过真实用户会话为每个引擎播种 12 行，走工作台默认 10 行分页并翻到第 2
   页，产生真实 REST filters/pagination。断言不仅要看 DOM，还要捕获真实 GET 请求
   的 filter（搜索 token）与 `limit`/`offset`，并核对真实返回 JSON 行；详情必须
   触发真实 GET 单行请求，快速编辑必须使用内置 Drawer 与默认 Save。
5. 首次保存使用 sentinel，断言真实 PATCH 非 2xx 且稳定数据库错误码为 `23514`，
   独立用户会话读回原行未变，Drawer 保留草稿，页面不泄漏约束名/数据库诊断。
   第二次修正 title 后保存，断言真实 PATCH 2xx、独立会话读回更新、列表回填，
   搜索输入、分页页码和真实 checkbox 选择保持不变；精确记录失败/成功 PATCH 次数。
6. 独立 B 浏览器 context 与 B 凭据打开同一 workspace，至少断言真实列表查询返回
   空结果、页面无 A 的 title，且无 browser_records 写请求。可复用既有 B 详情拒绝
   证据，但不冒充本轮重复覆盖。
7. 保留旧 13 项断言与 runner 期望之外的新增 1 项，测试总数变为 14；新增项内部
   依次运行 Chromium、Firefox、WebKit，缺少任一引擎失败，不 skip。代理 allowlist
   仍只精确允许既有 Auth/Object 与本轮 `browser_records` GET/POST/PATCH，不放宽到
   任意资源、host 或方法。

## 非目标

- 不引入生产 RBAC、版本服务、跨服务事务、审批流、部署或发布。
- 不 mock 网络、Provider、数据库或直接输出 UI 成功；不以 service-role 写入或
  直接 DOM 事件伪造真实用户动作。
- 不覆盖跨源 CORS、大文件流式、读屏、MFA/OAuth、真实外部账号或生产 bucket/RLS。
- 不修改生产组件/API；若现有 API 无法支撑该流程，先报告具体缺口，不以更窄的
  成功路径替代。

## 验收场景

```gherkin
Scenario: 真实工作台查询、分页、选择与详情
  Given A 已通过真实 GoTrue 登录且 app_metadata 为 tenant-a
  And A 已用真实用户会话为每个引擎播种 12 条搜索前缀相同、title 补零可稳定排序的 browser_records
  When A 在 ResourceOperationsPage 搜索前缀并翻到第 2 页
  Then 真实 GET 精确带 `title=ilike.%<search>%`、`limit=10`、`offset=10`、`order=title.asc`
  And 返回第 2 页真实行，目标 item 11 在更新后仍保持第 2 页
  And A 使用真实 checkbox 选择目标行并打开详情 Drawer
  Then 详情通过真实 GET 单行请求显示 title

Scenario: 快速编辑被真实数据库约束拒绝且保留草稿
  Given A 已在目标行打开内置 QuickEditDrawer
  When A 把 title 改为 test-only 非法 sentinel 并点击默认 Save
  Then 真实 PATCH 返回非 2xx 且数据库错误码为 23514
  And 独立 A 会话读回原 title 未变
  And Drawer 仍打开、草稿仍为 sentinel，页面不显示约束名或数据库诊断

Scenario: 修正后保存并保持列表查询与选择
  When A 把 title 修正为更新值并再次 Save
  Then 真实 PATCH 成功且独立 A 会话读回更新值
  And 列表刷新回填更新 title
  And 搜索输入、第 2 页页码与真实 checkbox 选择保持不变
  And PATCH 失败/成功次数分别精确为 1/1

Scenario: B 租户与安全边界
  Given B 使用独立浏览器 context 与 B 凭据登录 tenant-b
  When B 打开同一 workspace
  Then 真实列表 GET 返回空结果，页面不显示 A 的 title
  And B 不产生 browser_records 写请求
  And 浏览器只访问 fixture 回环 origin，页面/截图不出现邮箱、密码或 token
  And 结束后按精确 compose project label 确认容器、network、volume 无残留
```

## 执行状态

- 状态：主线程曾对 pi 初版独立通过 14/14 与精确 label 清理，该结果只作历史；随后
  审查修正了列表解析 fail-closed、完整 PATCH 采集/计数、稳定排序与精确 query 断言、
  详情 response、负面 probe 文档口径等。修正后 pi 已在同一 runner 重新通过
  `pass=14 fail=0 skip=0 todo=0`、exit 0，三引擎均运行，精确 project label 清理为空。
  主线程也独立通过修正版 14/14、窄检查与精确 label 清理，作为修正后运行时历史。
  随后视觉审查要求补充失败 alert/Drawer 与 B 空态的稳定帧、控件可操作/未裁剪断言，
  并汇总全部 fulfill capture 的 `parseError`；pi 已完成稳定帧补充并重新通过 14/14。
  主线程随后对稳定帧补充后的代码最终独立复验 **14/14，exit 0，零 skip/todo**，
  窄检查与精确临时资源清理均通过；稳定失败/空态截图已检查。本契约所列本地服务
  流程完成，Toast 覆盖标题与禁止创建时空态文案不匹配另记界面观察，整体企业级目标
  仍为 PARTIAL。
- 证据：`docs/evidence/enterprise-resource-workspace-service-20261026.md`（新增），
  保留 pi 初版、主线程初版历史、本轮审查修正与修正后 pi 结果，并补充主线程最终复验；
  旧证据不改写。
