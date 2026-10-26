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
  登录、身份读取、刷新、登出、refresh token 撤销和错误密码拒绝。未设置本地
  Auth 环境时测试会跳过，默认测试套件不会启动容器。

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

## 边界

本地通过也不能证明 GoTrue 生产配置、MFA/AAL、OAuth、邮件投递、Storage 对象
权限、真实租户/RBAC、跨客户端策略、屏幕阅读器、registry 发布、部署或在线验收。
