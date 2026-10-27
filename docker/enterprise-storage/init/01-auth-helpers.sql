-- 本地 Storage 验收使用的极简 auth schema。
-- Storage 使用独立数据库；即使同一栈另有 GoTrue，GoTrue 也只维护自己的 auth schema，
-- 不会在 Storage 数据库中创建这些函数。因此这里按 Supabase 官方定义补齐
-- Storage RLS 依赖的读取函数。
-- 角色（anon/authenticated/service_role/authenticator）与 storage 表结构
-- 由 storage-api 镜像自带迁移创建，这里不重复安装以免与迁移冲突。

CREATE SCHEMA IF NOT EXISTS auth;

-- Storage 直接以请求 JWT 的 claims 作为当前角色/请求头。
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')
  )::jsonb;
$$;
