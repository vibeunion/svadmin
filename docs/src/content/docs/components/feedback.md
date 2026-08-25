---
title: Feedback and Notices
description: Toast, FeedbackNotice, Alert, and feedback ownership
---

Use one primary feedback surface for one event.

## Toast

Use Toast for short-lived global feedback that does not require a page workflow:

```ts
const notification = useNotification();
notification.success('Saved', 3000, { key: 'record:42:save:7' });
```

The built-in host is collapsed, shows at most three items, and uses keys as
Sonner IDs. A key must identify one event.

## FeedbackNotice

Use `FeedbackNotice` only for unresolved page context, required action, or a
blocking state. It supports `info`, `warning`, and `danger`; there is no success
tone.

```svelte
<script lang="ts">
  import { Button, FeedbackNotice } from '@svadmin/ui';
</script>

{#snippet action()}
  <Button size="sm">Complete fields</Button>
{/snippet}

<FeedbackNotice
  tone="warning"
  message="3 required fields still need input."
  {action}
/>
```

Use `priority="blocking"` for failures that stop the primary workflow. The
component then exposes assertive alert semantics.

## Alert

`Alert` is a low-level compatibility primitive. Use it for bounded inline error
or warning content. Do not use its success variant as a persistent page-level
mutation confirmation.

See [Interface Generation Standard](/guides/interface-generation/) for the full
decision table and information budget.
