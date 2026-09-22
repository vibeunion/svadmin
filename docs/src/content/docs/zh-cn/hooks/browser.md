---
title: 浏览器 Hooks
description: "@svadmin/ui 中基于 Svelte runes 的浏览器工具"
---

`@svadmin/ui` 提供一组面向浏览器场景的 Svelte 5 runes hooks：客户端运行、
SSR 安全降级、组件销毁时自动清理。没有 React 式 hooks 运行时，也不引入额外依赖。

所有 hook 都必须在**组件初始化期间**调用。每个 hook 都会注册一个作用域内
effect，在回调里再调用不会生效。

```svelte
<script lang="ts">
  import { useDebouncedValue } from '@svadmin/ui';

  let query = $state('');
  const debounced = useDebouncedValue(() => query, 300);
</script>

<input bind:value={query} />
<p>正在搜索：{debounced.value}</p>
```

## 响应式与设备

| Hook | 返回 | 说明 |
| --- | --- | --- |
| `useMediaQuery(query, fallback?)` | `{ matches }` | 响应式 `window.matchMedia`；SSR 使用 `fallback`（默认 `false`） |
| `useDeviceDetect()` | `{ isMobile, isTablet, isDesktop, isTouch, prefersReducedMotion, prefersDark }` | 基于 `useMediaQuery`；服务端默认为桌面、允许动画的档案 |
| `useWindowSize()` | `{ width, height }` | 视口尺寸；服务端返回 `0` |

导出的 `MOBILE_QUERY`、`TABLET_QUERY`、`TOUCH_QUERY`、`REDUCED_MOTION_QUERY`、
`DARK_QUERY` 常量可复用同一套断点，无需硬编码字符串。

## 剪贴板与持久化

| Hook | 返回 | 说明 |
| --- | --- | --- |
| `useClipboard({ timeout? })` | `{ copied, copy(text) }` | Clipboard API 不可用或被拒绝时 `copy` 解析为 `false`；`copied` 在 `timeout` 毫秒（默认 1600）后复位 |
| `useLocalStorage(key, initial)` | `{ value, set, remove }` | JSON 序列化，通过 `storage` 事件跨标签页同步；外部脏写会被忽略 |

```svelte
<script lang="ts">
  import { useClipboard, useLocalStorage } from '@svadmin/ui';

  const clipboard = useClipboard();
  const draft = useLocalStorage('order-draft', { note: '' });
</script>

<button onclick={() => clipboard.copy(draft.value.note)}>
  {clipboard.copied ? '已复制' : '复制备注'}
</button>
```

`useLocalStorage` 会在挂载时写入初始值。用户相关的值请按用户或租户加命名空间，
且不要存储凭据或 token。

## 计时、事件与交互

| Hook | 返回 | 说明 |
| --- | --- | --- |
| `useDebouncedValue(source, delay?)` | `{ value }` | 对响应式 getter 做尾沿防抖；`delay` 默认 200ms |
| `useInterval(callback, delay)` | `void` | `delay` 是 getter；返回 `null` 或非正数即暂停 |
| `useEventListener(target, type, handler, options?)` | `void` | `target` 变化时重新绑定；接受 `EventTarget` 或 getter |
| `useOnClickOutside(target, handler, enabled?)` | `void` | 优先用 `composedPath()`，回退到 `contains`；`enabled` 可在弹层关闭期间挂起 |
| `useSwipe(target, handlers)` | `void` | 基于 `pointerdown`/`pointerup` 识别单指 swipe，可配 `threshold`（默认 30）；pinch/旋转用 `svelte-gestures` |

## 服务端渲染

所有 hook 都可在服务端安全导入。仅浏览器可用的 hook 在 SSR 期间返回文档化
的兜底值（不匹配、尺寸为 `0`、初始存储值），水合后自行校正。不要在 SSR
输出上根据媒体查询结果分支；先渲染中性布局，再在客户端增强。

## 边界

这些 hook 只覆盖常见后台需求。需要专用或重依赖实现的分类交给 Svelte 生态，
见[生态覆盖对照](/zh-cn/guides/ecosystem-coverage/)。