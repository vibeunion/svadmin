# OrbStack GoTrue Auth provider smoke（2026-10-26）

## 范围

这是本机、可丢弃的 GoTrue 兼容性验收，不是生产 Auth、MFA、Storage、RBAC 或
在线发布验收。测试使用 `orbstack` context、随机 Compose project、随机 loopback
端口、临时 PostgreSQL 和进程内凭据；结束时执行 `down -v --remove-orphans`。

## 实现

- `docker/enterprise-test/auth-compose.yml`：PostgreSQL 18 + 本机缓存的
  `public.ecr.aws/supabase/gotrue:v2.197.0`。
- `scripts/fixtures/enterprise-runtime/run-auth-smoke.ts`：启动、健康检查、运行
  单一测试、无论成功失败清理；不打印 token 或连接串。
- `scripts/fixtures/enterprise-runtime/supabase-auth.test.ts`：通过真实
  `@supabase/supabase-js` 客户端注入现有 `createSupabaseAuthProvider`，覆盖注册、
  登录、check、身份读取、刷新、登出、refresh token 撤销和错误密码拒绝。未设置
  runner 专用标记时测试跳过；启用后必须提供 loopback URL 和临时凭据，否则明确失败。
  runner 必须取得完成标记才报告通过，默认测试套件不会启动容器。

## 验收记录

状态：本机真实 Auth smoke 已通过；真实服务/RBAC/生产验收仍独立计证。

建议命令：

```bash
bun scripts/fixtures/enterprise-runtime/run-auth-smoke.ts
```

本轮实际结果：`1 pass / 0 fail / 20 expect() calls`，耗时 1.54s，测试退出码 `0`。
临时 Compose project `svadmin-auth-smoke-ea7c1449-4d59-4872-8c7d-d71494ff38b8`
已在测试结束后执行 `down -v --remove-orphans`，现有业务容器未被修改。

若失败，记录阶段和退出码即可；不要把服务日志、JWT、密码或连接串复制到文档。

### 独立审查后的复验

- 本轮复验：`1 pass / 0 fail / 22 expect() calls`，runner 退出码 `0`，完成标记通过。
- 最终代码再次复跑仍为 `1 pass / 22 assertions`，项目
  `svadmin-auth-smoke-09ed2a33-5d39-4b86-98ae-e3671b1a5dcc` 已清理，容器和 network
  label 回读均为空。
- 项目：`svadmin-auth-smoke-b8345688-28ef-4e4c-b30a-1e01402bfa3d`；`down -v`
  成功，按该项目 label 回读容器及 network 均为空。其他历史容器不作为本轮资源清理。
- 登录及刷新后分别验证 `check().authenticated`；登出后使用**刷新后的当前令牌**
  在独立客户端重放，并验证服务返回 `refresh_token_not_found`。
- 单文件 remote URL 负例：runner 标记存在、目标为保留域名 `example.invalid` 时，
  测试在 client 创建前以 loopback 校验失败退出；检查程序确认预期 exit `1`。
- 认证对象/令牌断言转换为布尔投影；失败只输出允许的阶段，不打印 SDK 会话或服务日志。
  请求禁用重定向并有超时；测试结束停止两个客户端自动刷新。
- 目标 ESLint `--max-warnings 0` 和 `git diff --check` 通过；未执行全量测试或全仓类型检查。
  独立只读审查复核当前两个脚本后未发现剩余阻断；真实服务运行由主线程执行，
  不将静态审查描述为第二次独立运行。
- 仅本地测试契约：自动确认邮箱、HS256 临时密钥、`authenticated` audience，固定
  本地 issuer `http://127.0.0.1:9999`（与随机访问端口区分）；不验证邮件或 issuer 校验链。
  runner 在临时库创建 `auth` schema，镜像执行自身迁移，连接显式使用 `search_path=auth`。
- 外部流程已产生提交 `72ce9847`；本节描述该提交之后的工作区加固，不等同于已提交、
  已发布或在线验收。

## 边界

本地通过也不能证明 GoTrue 生产配置、MFA/AAL、OAuth、邮件投递、Storage 对象
权限、真实租户/RBAC、跨客户端策略、屏幕阅读器、registry 发布、部署或在线验收。
