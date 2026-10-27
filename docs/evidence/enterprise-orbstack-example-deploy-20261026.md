# OrbStack 示例静态部署（2026-10-26）

## 范围

把当前 `example/dist` 挂进一次性 `nginx:alpine` 容器，只验证 loopback HTTP。不是 registry 发布、生产部署或在线验收。

## 结果

先执行 `bun run build:example`，退出码 0。随后用 OrbStack 将 `example/dist` 以只读方式挂到 `nginx:alpine`：

- HTTP `200`
- 响应包含 `id="app"`
- 容器 `svadmin-example-smoke-7329d9` 在读取后删除
- 重复命令 `scripts/fixtures/enterprise-runtime/run-example-deploy.sh` 再次返回 HTTP 200，并删除 `svadmin-example-smoke-300e88`

可重复命令是 `scripts/fixtures/enterprise-runtime/run-example-deploy.sh`。它不保留容器。

## 不能用 OrbStack 冒充的项目

- 实机屏幕阅读器：OrbStack 没有 VoiceOver / NVDA / JAWS，本次没有把静态页或容器健康检查写成读屏通过。
- B2-06 父项语义和 B4 新引擎不是容器能力。决定见 `docs/evaluations/b2-06-parent-value-decision-20261026.md` 与 `docs/evaluations/b4-scenario-decision-20261026.md`。
