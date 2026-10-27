# 真实浏览器 AutoForm 上传 → PostgREST/PostgreSQL 持久化验收契约

- parent: `docs/evaluations/enterprise-postgrest-tenant-acceptance-contract-20261026.md`
- source: `docs/evaluations/enterprise-autoform-upload-browser-contract-20261026.md`
- reason: 上一轮 AutoForm 浏览器场景只证明上传成功与提交 JSON 引用，提交回调明确只是
  捕获，不是业务持久化；PostgREST 场景只证明 Node 侧 `createSupabaseDataProvider`
  CRUD，不包含浏览器 AutoForm、原生文件选择、重新打开编辑或跨租户浏览器读取。
  本轮补齐真实浏览器上传后经当前 data provider 保存到 PostgreSQL 的单一闭环。
- orchestration/risk: managed / medium；pi 为唯一实施 writer，主线程独立审查与最终
  台账。无 `coordination.json` / agmesh CLI；以本契约记录范围、状态与边界。
- workspace: 隔离工作树 `enterprise-storage-acceptance/svadmin`，保留全部 dirty。
  不修改原工作区、不修改共享 `node_modules`、不提交推送发布。被测 UI/Core/
  Supabase/refine 源码仍显式解析到当前工作树。
- profile: 沿用既有本地 PostgreSQL 18 / PostgREST v12.2.12 / GoTrue v2.197.0 /
  Storage v1.80.0 profile 与本地镜像 `--pull never`，不引入新栈。

## 范围

1. 新增仅本地验收使用的独立表 `enterprise_acceptance.browser_records`：`id`、
   `title`、`attachment jsonb` 引用、`tenant_id`。AutoForm 不提交 `tenant_id`；列
   DEFAULT 取可信 JWT `app_metadata.tenant_id`，RLS 只信任该声明并校验任何显式值。
   该表只是本地可丢弃验收资源，不是生产业务模型。
2. 新增专用 AutoForm fixture 宿主与入口，复用既有 `AdminApp`、真实 `AutoForm`、
   `FileUploadField`、当前 worktree 的 `createSupabaseDataProvider` 和真实 GoTrue
   会话；不修改旧捕获 JSON 场景。宿主可创建、编辑同一行；`AdminApp` 是唯一页面壳，
   认证控件在 dashboard 正常文档流，不使用 fixed 遮挡或 force click。
3. 复用既有浏览器 helper、同源代理、Vite 与 runner。新增 PostgREST 代理仅按
   method+path 精确映射 `/rest/v1/browser_records` 的 GET/POST/PATCH 到固定回环
   origin；其它 resource、路径、方法和重定向继续拒绝。代理不检查 schema 选择头，
   schema 暴露范围由 PostgREST 自身负责。请求体上限、读取/转发超时、断开取消和
   teardown 保持既有实现，不退化。
4. service-role 只在 Node 侧播种租户 `app_metadata`、独立回读与最终清理；永不注入
   浏览器。全部上传、AutoForm Save、编辑读回和 B 的读取尝试都来自真实用户会话。
5. 沿用既有 Storage 路径与每引擎 primary 对象，Node 侧以独立用户会话和 service
   role 分别读回真实字节。浏览器不录制 HAR/trace/video/storageState，不写
   storageState；凭据与 token 只进对应浏览器 context 内存，断言只使用布尔值。
6. 保留原 12 项断言，只在单一
   `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts` 新增 1 项，
   runner 期望 `pass=13 fail=0 skip=0 todo=0`。Chromium、Firefox、WebKit 都必须
   运行，缺少任一引擎直接失败，不 skip。

## 非目标

- 不扩展生产业务模型、生产 RBAC、版本服务、审批流、部署或发布。
- 不以捕获 JSON、mock provider、直接 data provider 调用或 service-role 写入冒充
  浏览器 AutoForm 的业务持久化。
- 不覆盖跨源 CORS、大文件流式、读屏、MFA/OAuth、真实外部账号或生产 bucket/RLS。
- 不修改生产 API；若发现真实产品缺陷，先报告，不在验收中掩盖。

## 验收场景

```gherkin
Scenario: A 真实浏览器 AutoForm 上传并创建真实行
  Given A 通过真实 GoTrue 登录且 app_metadata 带 tenant-a
  When A 在 AutoForm 填入 title、通过原生 input[type=file] 选择 txt 并点击默认 Save
  Then data provider 经 PostgREST 在 enterprise_acceptance.browser_records 创建真实行
  And Node 独立 GoTrue 会话读回该 title
  And attachment.uploadId 关联 Storage 中真实对象，独立读回对象字节与上传文件一致

Scenario: 同一行重新打开编辑并保存更新
  Given A 已创建上述 browser_records 行
  When A 重新打开该行 edit 页面并 reload，DOM 回显 title 与 attachment 引用
  And A 更改 title 后点击默认 Save
  Then Node 独立 GoTrue 会话读回更新后的 title 与原 attachment 引用
  And 原 Storage 对象字节未变

Scenario: 另一租户浏览器不能读取 A 的行
  Given B 使用独立浏览器 context 登录且 app_metadata 为 tenant-b
  When B 打开 A 的行 edit 地址并登录
  Then 实际发出 GET /rest/v1/browser_records?id=eq.<rowId>，服务端返回 200 + 空数组
  And 页面安全显示加载失败，不显示 A 的 title 或 attachment
  And B 的 context 不产生 browser_records POST/PATCH，也不产生对象写入

Scenario: 凭据、回环 allowlist 与清理
  Given 浏览器只允许本轮 fixture 回环 origin
  When 页面尝试未列出的 Auth/REST/Object 路径或方法
  Then 代理返回 403 且无外部请求
  And 页面、截图与输出不包含邮箱、密码、token、service key 或 signing secret
  And 流程结束后按精确 project label 确认容器、network、volume 无残留

Scenario: 持久化引用与实际 Storage 对象关联
  Given A 已创建 browser_records 行
  Then attachment 精确为 { uploadId }
  And service role 列出对应目录只有 primary.txt，且对象 id 等于 uploadId
  And owner 与 service role 分别读回同一文件字节
  And 重新加载并更新后最终目录仍无额外对象
```

## 执行状态

- 状态：本契约本地验收完成。pi 初版与审查修正后结果保留为历史；主线程随后独立
  复跑同一 runner，`pass=13 fail=0 skip=0 todo=0`、exit 0，三引擎均运行。
  主线程精确 project label 的容器/network/volume 复核为空，定向 TS/ESLint/Svelte
  与 diff 检查通过，9 张桌面截图已检查。整体企业级目标仍为 PARTIAL，未合并发布。
- 证据：`docs/evidence/enterprise-autoform-postgrest-record-20261026.md`（新增），
  其中区分 pi 历史结果与主线程独立复验；旧证据不改写。
