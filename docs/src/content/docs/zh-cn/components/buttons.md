---
title: CRUD 按钮
description: 10 个预构建的管理操作按钮
---

svadmin 包含 10 个与数据 Hook 和路由集成的操作按钮。

## 可用按钮

| 按钮 | 说明 | 关键操作 |
|------|------|----------|
| `CreateButton` | 导航到创建表单 | `navigate('/{resource}/create')` |
| `EditButton` | 导航到编辑表单 | `navigate('/{resource}/edit/{id}')` |
| `DeleteButton` | 带确认的删除 | `useDelete().mutate()` |
| `ShowButton` | 导航到详情页 | `navigate('/{resource}/show/{id}')` |
| `ListButton` | 导航到列表 | `navigate('/{resource}')` |
| `RefreshButton` | 刷新当前范围的数据查询 | `useInvalidate({ resource: contract })` |
| `ExportButton` | 导出已校验的 CSV 数据 | `useExport({ resource: contract })` |
| `ImportButton` | 导入已校验的 CSV 或 JSON | `useImport({ resource: contract })` |
| `SaveButton` | 提交表单 | 触发 `submit()` |
| `CloneButton` | 克隆现有记录 | `navigate('/{resource}/create?clone={id}')` |

## 用法

```svelte
<script>
  import { EditButton, DeleteButton } from '@svadmin/ui';
</script>

<EditButton resource="posts" id={record.id} />
<DeleteButton resource="posts" id={record.id} onSuccess={() => refetch()} />
```

## 导出契约

`ExportButton resource="posts"` 要求资源元数据包含通过 `defineResource`
创建的真实 `contract`。下载前，每一页数据都必须通过业务 schema 校验；
显示字段不能代替数据契约。

代码中使用公开入口 `useExport({ resource: postsContract })`，返回记录和映射
函数的输入类型由契约推导。旧的资源名称参数和 unsafe 导出入口已删除。
即使提供 `onError`，失败仍会拒绝 Promise；切换资源、租户或数据源会取消旧下载。
按钮在导出期间禁用，失败时显示脱敏错误，并允许再次点击重试。

## 导入契约

`ImportButton resource="posts"` 要求资源注册包含创建 schema 的真实 `contract`。
开始写入前，整份文件的解析结果和映射结果都必须通过校验。CSV 字段保持字符串，
需要数字等业务类型时使用 `mapData` 显式转换。CSV 格式错误或数据不符合 schema
时，不会写入任何行。

```svelte
<ImportButton resource="posts" onFinish={({ succeeded, errored }) => console.log(succeeded, errored)} />
```

成功项是已校验的记录；失败项包含从 1 开始的数据行号 `row`、已校验的请求
`request` 和脱敏后的 `error`。部分完成的导入不会自动回滚，可能已经成功的写入
不会自动重试。按钮检查导入权限和 `canCreate`，防止重复事件，并允许失败后显式
重新选择文件。

代码中使用公开的 `useImport({ resource: postsContract })`，再等待
`handleChange({ file })`。完成前会等待原数据源相关缓存刷新结束；文件或输入错误、
取消操作会拒绝 Promise。切换范围会停止后续写入，但不会撤销已发送的请求。
旧的资源名称参数和 unsafe 导入入口已移除。

## 刷新契约

`RefreshButton` 同样要求资源元数据包含真实 `contract`。它只刷新当前契约、
资源、租户和命名数据源下的列表与批量查询，并等待所有选中查询结束。
执行期间按钮禁用，失败后显示脱敏错误，允许再次点击重试。

代码中先在组件初始化时创建 `const invalidate = useInvalidate({
resource: postsContract })`，再调用
`await invalidate({ invalidates: ['list', 'many'] })`。返回类型为
`Promise<void>`，失败会拒绝 Promise。空范围数组和 `false` 不触发刷新，
记录 ID 必须符合契约。`useList`、`useOne`、`useMany`、`useInfiniteList`
及复用这些入口的表格和详情页查询还区分数据源实例。表单专用查询和选择器
的实例标识迁移仍需继续完成。
