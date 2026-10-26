# OrbStack 对象存储与记录版本验收（2026-10-26）

## 范围

本机可丢弃的 Storage API `v1.80.0` 与 PostgREST `v12.2.12`。不是生产对象存储、签名 URL 策略、版本恢复、冲突合并或发布验收。凭据只存在于 runner 进程。

## 实现

- `docker/enterprise-test/storage-compose.yml`：PostgreSQL 18、文件后端 Storage API、版本表 PostgREST。
- `scripts/fixtures/enterprise-runtime/run-storage-smoke.ts`：随机项目、loopback 端口、迁移后授予 `service_role`，结束时 `down -v`。
- `storage-object.test.ts`：service role 建桶、上传、读回、删除；匿名 JWT 不能读回。
- `record-version.test.ts` 与 `packages/ui/src/components/version-history.ts`：两条快照按版本号映射为现有 `oldValue` / `newValue`。未知选择、重复版本和非普通对象失败关闭。没有恢复动作。

## 结果

`bun scripts/fixtures/enterprise-runtime/run-storage-smoke.ts`：

- 2 pass / 0 fail / 11 expect() calls
- 退出码 0
- 项目 `svadmin-storage-smoke-4569f31a-5306-415b-b86b-753fbb9d3933` 已清理

定向单元测试 `packages/ui/src/components/version-history.test.ts`：3 pass，退出码 0。

未设置 `SVADMIN_STORAGE_SMOKE_RUN` 时，两个集成测试跳过，默认套件不启动容器。

## 边界

这次不证明生产 bucket 策略、签名 URL、租户隔离、上传取消幂等、版本权限、版本恢复、实机读屏或 registry 发布。
