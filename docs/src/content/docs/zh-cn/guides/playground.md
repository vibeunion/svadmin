---
title: 演练场
description: 可直接运行的垂直示例与脚手架路径
---

svadmin 已经带有可运行的垂直示例，不需要再铺一整套模板农场。

## 示例应用

仓库里的 `example/` 是浏览器演练场，包含这些现成工作区：

- 房产运营
- 库存、商品与采购单
- CRM 客户、联系人与商机
- 邮件、计划与人员管理

在仓库根目录启动：

```sh
bun run dev
```

## 脚手架蓝图

`@svadmin/create` 自带两份垂直蓝图，可以直接阅读或复制：

- `packages/create-svadmin/blueprints/customer-workspace` — 客户列表、详情与 provider 接线
- `packages/create-svadmin/blueprints/product-workspace` — 产品工作区组合

`create-svadmin init` 会生成可运行应用。`create-svadmin add provider <name> --write` 会写入 `src/svadmin.config.ts`、`.env.example` 和 `src/examples/<name>-smoke.ts`。用 Bun 运行这个 smoke 文件即可检查 provider。托管后端仍然需要真实凭据；缺少变量时 smoke 会报出变量名，而不是留下 TODO 占位。

`create-svadmin infer` 会生成 AutoTable 与 AutoForm 可通过 `defineResource()` 解析的严格资源契约。
