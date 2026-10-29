# Theme System / 主题系统

> Dark mode + multi-color theme management

## Dark Mode / 暗色模式

```typescript
import { setTheme, toggleTheme, getTheme, getResolvedTheme } from '@svadmin/core';

setTheme('dark');     // 'light' | 'dark' | 'system'
toggleTheme();        // toggle light ↔ dark
getTheme();           // current setting ('light' | 'dark' | 'system')
getResolvedTheme();   // resolved to 'light' or 'dark'
```

AdminApp `defaultTheme` prop sets the initial mode. Persisted to `localStorage`.

AdminApp 的 `defaultTheme` 属性设定初始模式，自动持久化到 `localStorage`。

## Theme Strategy / 主题策略

By default, svadmin uses **standard** strategy: light-first with a `.dark` CSS class for dark mode. For apps that default to dark mode (e.g. dashboards, creative tools), use **dark-first** strategy:

默认使用 **standard** 策略：默认亮色，通过 `.dark` CSS 类切换暗色。对于默认暗色的应用（如仪表盘、创意工具），使用 **dark-first** 策略：

```typescript
import { configureTheme } from '@svadmin/core';
import type { ThemeConfig } from '@svadmin/core';

// Standard (default): adds .dark class for dark mode
configureTheme({ strategy: 'standard' });

// Dark-first: adds .light class for light mode (dark is default)
configureTheme({ strategy: 'dark-first' });
```

Or via `AdminApp` prop:

```svelte
<AdminApp
  {dataProvider}
  {resources}
  themeConfig={{ strategy: 'dark-first' }}
  defaultTheme="dark"
/>
```

| Strategy | Default Mode | CSS Class | Use Case / 使用场景 |
|----------|-------------|-----------|--------------------|
| `standard` | Light | `.dark` added for dark | General admin panels / 通用管理面板 |
| `dark-first` | Dark | `.light` added for light | Dark dashboards, creative tools / 暗色仪表盘、创意工具 |

## CSS Variable Overrides / CSS 变量覆盖

Override design tokens programmatically via `configureTheme`:

通过 `configureTheme` 编程式覆盖 design tokens：

```typescript
import { configureTheme, clearCssOverrides } from '@svadmin/core';

configureTheme({
  strategy: 'dark-first',
  cssOverrides: {
    '--primary': 'rgb(108, 124, 255)',
    '--background': 'rgb(5, 8, 17)',
    '--radius': '0.8rem',
  },
});

// Remove all overrides later
clearCssOverrides();

// Remove specific overrides
clearCssOverrides(['--primary']);
```

This injects CSS variables directly onto `<html>`, taking highest priority over `app.css` defaults.

这会将 CSS 变量直接注入 `<html>`，优先级高于 `app.css` 的默认值。

Color tokens must contain complete CSS color values. Convert legacy HSL channel
values into ordinary CSS variables rather than adding compiler directives:

颜色 token 应保存完整 CSS 颜色。旧 HSL 通道值使用原生 CSS 归一化，不需要 Tailwind 指令：

```css
:root, .svadmin-theme {
  --legacy-border-channels: 214.3 31.8% 91.4%;
  --border: hsl(var(--legacy-border-channels));
  --color-border: var(--border);
}
```

Using `border-color: var(--border)` with channel-only values is invalid CSS and falls back to `currentColor`, which can create unexpectedly dark borders.

将仅含通道的值直接用于 `border-color: var(--border)` 属于无效 CSS，会回退到 `currentColor`，从而产生异常深色边框。

### ThemeConfig Reference / 配置参考

| Property | Type | Default | Description / 描述 |
|----------|------|---------|-------------------|
| `strategy` | `'standard' \| 'dark-first'` | `'standard'` | Class toggle strategy / 类名切换策略 |
| `cssOverrides` | `Record<string, string>` | — | CSS variables to inject on `<html>` / 注入到 `<html>` 的 CSS 变量 |
| `disableColorScheme` | `boolean` | `false` | Skip setting `color-scheme` attribute / 跳过 `color-scheme` 属性 |
| `colorPreset` | `ColorPreset \| string` | `'arco'` | Built-in or registered color preset; the built-in preset is used when no selection exists / 内置或注册的配色预设；未选择时使用内置配色 |
| `layoutPreset` | `'default' \| 'clean-flat'` | `'default'` | Layout composition / 布局结构 |

## Color Themes / 多色主题

9 built-in color palettes, switchable via sidebar picker or API. The built-in preset is the default:

9 种内置配色，通过侧边栏选色器或 API 切换。默认是内置配色：

The example combines both presets:

示例同时使用以下两个预设：

```svelte
<AdminApp themeConfig={{ colorPreset: 'arco', layoutPreset: 'clean-flat' }} />
```

```typescript
import { getColorTheme, setColorTheme, getColorThemes } from '@svadmin/core';
import type { ColorTheme } from '@svadmin/core';

setColorTheme('rose');    // set active color theme
getColorTheme();          // current color theme id

// Available themes
getColorThemes().forEach(ct => {
  console.log(ct.id, ct.label, ct.color);
});
```

| Theme | ID | Hex |
|-------|----|-----|
| Default | `arco` | `#165DFF` |
| Neutral | `neutral` | `#71717a` |
| Indigo | `indigo` | `#4f46e5` |
| Blue | `blue` | `#3b82f6` |
| Green | `green` | `#22c55e` |
| Rose | `rose` | `#f43f5e` |
| Orange | `orange` | `#f97316` |
| Violet | `violet` | `#8b5cf6` |
| Stripe | `stripe` | `#635bff` |

### How It Works / 工作原理

- Color theme sets `data-theme` attribute on `<html>` element
- CSS variables in your theme CSS respond to `[data-theme="..."]` selectors
- Persisted to `localStorage` under `svadmin-color-theme` key

颜色主题在 `<html>` 上设置 `data-theme` 属性，CSS 变量根据 `[data-theme="..."]` 选择器响应。持久化到 `localStorage`（key: `svadmin-color-theme`）。

## Sidebar Controls / 侧边栏控制

The built-in sidebar provides:

内置侧边栏提供：

- 🎨 **Color picker** — Colored dots at sidebar footer to switch themes / 选色器圆点
- 🌓 **Dark mode toggle** — Sun/Moon icon button / 日月图标按钮
- 🌐 **Locale toggle** — Click to cycle through available locales / 点击切换语言

## Semantic Status Tokens / 语义状态变量

`@svadmin/ui` provides semantic CSS variables for status colors. All components use these tokens instead of hardcoded Tailwind colors, making them fully customizable:

`@svadmin/ui` 提供语义化 CSS 变量用于状态颜色。所有组件均使用这些 token，不再硬编码 Tailwind 颜色，完全可自定义：

| Token | Tailwind Class | Default (Light) | Default (Dark) | Usage / 用途 |
|-------|---------------|-----------------|----------------|-------------|
| `--success` | `bg-success` | `142 71% 45%` | `142 71% 45%` | Positive status / 成功状态 |
| `--success-foreground` | `text-success-foreground` | `0 0% 100%` | `0 0% 100%` | Text on success / 成功文本 |
| `--warning` | `bg-warning` | `38 92% 50%` | `38 92% 50%` | Caution / 警告状态 |
| `--warning-foreground` | `text-warning-foreground` | `0 0% 100%` | `0 0% 100%` | Text on warning / 警告文本 |
| `--info` | `bg-info` | `217 91% 60%` | `217 91% 60%` | Informational / 信息状态 |
| `--info-foreground` | `text-info-foreground` | `0 0% 100%` | `0 0% 100%` | Text on info / 信息文本 |

Override in your `app.css` or via `configureTheme({ cssOverrides })` API:

在你的 `app.css` 中覆盖或通过 `configureTheme({ cssOverrides })` API：

```css
:root {
  --success: 160 84% 39%;          /* Teal instead of green */
  --warning: 25 95% 53%;           /* Orange instead of amber */
}
```

```typescript
// Or programmatically / 或编程式覆盖
configureTheme({
  cssOverrides: {
    '--success': 'oklch(0.65 0.2 160)',
    '--warning': 'oklch(0.8 0.15 55)',
  },
});
```

## Size Tokens / 尺寸变量

Colors were never the whole theme. Controls, rows, spacing and type sizes are
tokens too, so a host can change density or scale by overriding variables
instead of re-writing component CSS.

颜色从来不是主题的全部。控件、行、间距和字号同样是 token，宿主可以通过覆盖变量
调整密度或尺寸，而不是重写组件 CSS。

| Token | Default | Meaning / 含义 |
|-------|---------|----------------|
| `--svadmin-control-h-sm` | `1.75rem` | Compact control / 紧凑控件 |
| `--svadmin-control-h` | `2.25rem` | Default control height / 默认控件高度 |
| `--svadmin-control-h-lg` | `2.5rem` | Large control / 大号控件 |
| `--svadmin-row-h` | `3rem` | Table and list row rhythm / 行节奏 |
| `--svadmin-table-head-h` | `2.75rem` | Table header height / 表头高度 |
| `--svadmin-table-state-min-h` | `8rem` | Table empty/loading state height / 表格状态高度 |
| `--svadmin-space-1…6` | `4px … 32px` | Spacing scale / 间距刻度 |
| `--svadmin-section-gap` | `--svadmin-space-5` | Gap between page sections / 区块间距 |
| `--svadmin-text-caption`…`--svadmin-text-title` | `12px … 20px` | Type scale / 字号刻度 |
| `--svadmin-leading-tight`…`--svadmin-leading-body` | `1.25 … 1.5` | Line heights / 行高 |
| `--svadmin-measure` | `65ch` | Reading measure / 阅读宽度 |
| `--svadmin-shell-topbar-h` | `3.5rem` | App shell topbar / 顶栏高度 |
| `--svadmin-shell-sidebar-w` | `15rem` | Expanded navigation rail / 展开导航 |
| `--svadmin-shell-gutter` | `--svadmin-space-5` | Page gutter / 页面留白 |
| `--svadmin-shell-max` | `74rem` | Content max width / 内容最大宽度 |

Override them where the component tree is rooted. Never duplicate a token in a
second selector: two declarations create a competing density baseline, and
`packages/ui/src/size-token-css.test.ts` fails when that happens.

在组件树根部覆盖即可。不要在第二个选择器里重复声明同一个 token：两处声明会产生
互相竞争的密度基线，`packages/ui/src/size-token-css.test.ts` 会直接失败。

```css
/* Enterprise forms often need 44px controls: one override, no CSS fork. */
.fa-app-shell {
  --svadmin-control-h: 2.75rem;
  --svadmin-row-h: 2.75rem;
  --svadmin-section-gap: var(--svadmin-space-6);
}
```


### Runtime shell preferences

`ThemeSettingsDrawer` and the exported `uiPreferences` store add runtime shell controls without a second theme system:

- navigation mode: sidebar, top bar, mixed, split sidebar
- navigation theme: light, dark, follow page theme
- content width: fixed, fluid, wide
- compact density and color-safe mode
- page transitions and reduced motion
- compact, default and rounded corner presets

Preferences persist in `localStorage` under `svadmin-ui-preferences`; `resetUiPreferences()` restores the documented defaults. The settings are applied as data attributes and classes on the document root, so components keep using the same semantic tokens.
