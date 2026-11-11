---
title: PocketBase 数据提供器
description: 将 PocketBase 单文件自托管后端的数据、认证与实时订阅接入 svadmin
---

`@svadmin/pocketbase` 为开源界极具人气的单一二进制全功能自托管后端 [PocketBase](https://pocketbase.io/)（Go + SQLite）提供了官方、轻量、开箱即用的 `DataProvider`、`AuthProvider` 与 `LiveProvider` 全套适配器。

## 安装

```bash
bun add @svadmin/pocketbase pocketbase
```

## 基础使用

```typescript
import PocketBase from 'pocketbase';
import {
  createPocketBaseDataProvider,
  createPocketBaseAuthProvider,
  createPocketBaseLiveProvider,
} from '@svadmin/pocketbase';
import { setDataProvider, setAuthProvider, setLiveProvider } from '@svadmin/core';

const pb = new PocketBase('http://127.0.0.1:8090');

const dataProvider = createPocketBaseDataProvider({ pb });
const authProvider = createPocketBaseAuthProvider({ pb });
const liveProvider = createPocketBaseLiveProvider({ pb });

setDataProvider(dataProvider);
setAuthProvider(authProvider);
setLiveProvider(liveProvider);
```

## 核心特性

- **原生 Filter 表达式编译**：完美映射 SvAdmin 复杂多条件过滤树与 `and` / `or` 组合逻辑为 PocketBase 官方 filter 规范（`id = "..." && created > "..."`）。
- **完整 CRUD 与批量操作**：全面实现 `getList`、`getOne`、`create`、`update`、`deleteOne`、`getMany` 与 `deleteMany`。
- **多字段排序无缝转换**：自动将排序指令转换为 PocketBase 的逗号分隔正负号规范（如 `created,-status`）。
- **开箱即用 AuthProvider**：无缝对接 PocketBase 用户认证体系（`authWithPassword`、`pb.authStore` 本地持久化、登出、用户信息解析）。
- **实时事件推送 LiveProvider**：利用 PocketBase 的 SSE 机制实现集合实时变动通知（`subscribe` / `unsubscribe`），组件卸载自动解除监听。
- **严苛契约测试验证**：经过 100% 针对 `@svadmin/core` 核心规范的自动化契约测试。

## 筛选操作符支持映射

| SvAdmin 操作符 | PocketBase 表达式映射 | 说明 |
| --- | --- | --- |
| `eq` | `field = 'val'` | 精确等于 |
| `ne` | `field != 'val'` | 不等于 |
| `gt`, `gte` | `field > 'val'`, `field >= 'val'` | 大于、大于等于 |
| `lt`, `lte` | `field < 'val'`, `field <= 'val'` | 小于、小于等于 |
| `contains`, `ncontains` | `field ~ 'val'`, `field !~ 'val'` | 文本包含、不包含 |
| `startswith`, `endswith` | `field ~ 'val%'`, `field ~ '%val'` | 前缀匹配、后缀匹配 |
| `null`, `nnull` | `field = null`, `field != null` | 为空、非空判断 |
| `in`, `nin` | `(field = 'a' || field = 'b')` | 集合包含、排除 |
| `between` | `(field >= min && field <= max)` | 闭区间范围 |
