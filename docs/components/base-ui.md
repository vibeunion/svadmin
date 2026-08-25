# Base UI Components / 基础 UI 组件

All base components are from [shadcn-svelte](https://shadcn-svelte.com/) with dark mode support.

所有基础组件基于 [shadcn-svelte](https://shadcn-svelte.com/)，支持暗色模式。

## Import / 导入

```typescript
import {
  Button, Input, Textarea, Select, Switch, Checkbox,
  Badge, Avatar, Skeleton, Sheet,
  Alert, Card, Dialog, Table, Tabs, Tooltip, DropdownMenu,
  Separator, cn,
} from '@svadmin/ui';
```

---

## Button

```svelte
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="icon"><Plus class="h-4 w-4" /></Button>
```

**Variants:** `default` | `outline` | `secondary` | `ghost` | `destructive` | `link`
**Sizes:** `xs` | `sm` | `default` | `lg` | `icon` | `icon-xs` | `icon-sm` | `icon-lg`

---

## Input

```svelte
<Input type="text" placeholder="Enter name..." bind:value={name} />
<Input type="email" placeholder="Email" />
<Input type="file" />
```

---

## Textarea

```svelte
<Textarea placeholder="Write something..." bind:value={content} />
```

---

## Select

```svelte
<Select bind:value={status} placeholder="Select status">
  <option value="active">Active</option>
  <option value="draft">Draft</option>
</Select>
```

---

## Switch

```svelte
<Switch bind:checked={enabled} />
<Switch checked={true} disabled />
```

**Props:** `checked` (bindable), `disabled`, `onCheckedChange`

---

## Checkbox

```svelte
<Checkbox bind:checked={agreed} />
```

---

## Avatar

```svelte
<Avatar src="/photo.jpg" alt="John" />
<Avatar fallback="JD" size="lg" />
<Avatar size="sm" alt="A" />
```

**Sizes:** `sm` (32px) | `default` (40px) | `lg` (48px) | `xl` (64px)

---

## Skeleton

```svelte
<Skeleton class="h-4 w-48" />
<Skeleton class="h-8 w-full rounded-xl" />
<Skeleton class="h-32 w-32 rounded-full" />
```

---

## Alert

`Alert` is a low-level inline primitive. Routine mutation success belongs in a
3-second Toast. Persistent page feedback is limited to unresolved context,
required action, or blocking failures; use `FeedbackNotice` for that layer.
Never show the same event in both Alert and Toast.

```svelte
<Alert.Alert>
  <Alert.Title>Heads up!</Alert.Title>
  <Alert.Description>This is a default alert.</Alert.Description>
</Alert.Alert>

<Alert.Alert variant="destructive">
  <Alert.Title>Error</Alert.Title>
  <Alert.Description>Something went wrong.</Alert.Description>
</Alert.Alert>

<Alert.Alert variant="success">
  <Alert.Title>Success</Alert.Title>
  <Alert.Description>Operation completed.</Alert.Description>
</Alert.Alert>
```

**Variants:** `default` | `destructive` | `warning` | `success`

---

## Tabs

```svelte
<script>
  let tab = $state('general');
</script>

<Tabs.Tabs>
  <Tabs.TabsList>
    <Tabs.TabsTrigger value="general" active={tab === 'general'} onclick={() => tab = 'general'}>
      General
    </Tabs.TabsTrigger>
    <Tabs.TabsTrigger value="advanced" active={tab === 'advanced'} onclick={() => tab = 'advanced'}>
      Advanced
    </Tabs.TabsTrigger>
  </Tabs.TabsList>
  <Tabs.TabsContent value="general" active={tab === 'general'}>
    General settings...
  </Tabs.TabsContent>
  <Tabs.TabsContent value="advanced" active={tab === 'advanced'}>
    Advanced settings...
  </Tabs.TabsContent>
</Tabs.Tabs>
```

---

## DropdownMenu

```svelte
<script>
  let open = $state(false);
</script>

<DropdownMenu.DropdownMenu bind:open>
  <Button onclick={() => open = !open}>Actions ▾</Button>
  {#if open}
    <DropdownMenu.DropdownMenuContent>
      <DropdownMenu.DropdownMenuItem onclick={() => console.log('edit')}>
        Edit
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuSeparator />
      <DropdownMenu.DropdownMenuItem destructive onclick={() => console.log('delete')}>
        Delete
      </DropdownMenu.DropdownMenuItem>
    </DropdownMenu.DropdownMenuContent>
  {/if}
</DropdownMenu.DropdownMenu>
```

---

## Sheet

```svelte
<script>
  let open = $state(false);
</script>

<Button onclick={() => open = true}>Open Sheet</Button>
<Sheet bind:open side="right">
  <h2 class="text-lg font-semibold">Settings</h2>
  <p>Sheet content here...</p>
</Sheet>
```

**Props:** `open` (bindable), `side` (`'left'` | `'right'`), `onClose`

---

## Card / Dialog / Table / Tooltip / Separator

These are compound components using the `Namespace.Component` pattern:

这些是使用 `命名空间.组件` 模式的复合组件：

```svelte
<Card.Card>
  <Card.CardHeader>
    <Card.CardTitle>Title</Card.CardTitle>
  </Card.CardHeader>
  <Card.CardContent>Content</Card.CardContent>
</Card.Card>
```

See source code for full sub-component API.

详见源码了解完整子组件 API。
