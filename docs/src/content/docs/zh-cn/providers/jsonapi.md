---
title: JSON:API 数据适配器
description: 将标准 JSON:API 1.0 规范后端接入 svadmin
---

`@svadmin/jsonapi` 为严格遵循 [JSON:API 1.0 国际规范](https://jsonapi.org/) 的后端系统（如 Drupal、Ruby on Rails、Ember Data、Laravel JSON:API）提供标准的 `DataProvider` 数据提供器。

## 安装

```bash
bun add @svadmin/jsonapi
```

## 基础用法

```typescript
import { createJsonApiDataProvider } from '@svadmin/jsonapi';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createJsonApiDataProvider({
  apiUrl: 'https://api.example.com/jsonapi',
});

setDataProvider(dataProvider);
```

## 特性

- **国际标准规范兼容**：自动封装与解析 `data.type`、`data.attributes` 及 `data.relationships` 复合文档结构。
- **自动解包侧载资源 (Sideloaded Included)**：自动将响应中 `included` 数组中的关联实体拼装并附加到主记录中。
- **规范化分页与过滤排序**：精准映射 `page[number]`/`page[size]`、`sort=-field` 及 `filter[field]=value`。
- **零额外重型依赖**：基于现代 Web Fetch 原生标准轻量实现。
