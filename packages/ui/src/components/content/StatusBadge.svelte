<script lang="ts">
  import { Badge } from '../ui/badge/index.js';
  export type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  interface Props {
    status: Status;
    label?: string;
    class?: string;
  }
  let { status, label = status, class: className = '' }: Props = $props();
  const toneClass: Record<Status, string> = {
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
    danger: 'border-destructive/30 bg-destructive/10 text-destructive',
    info: 'border-primary/30 bg-primary/10 text-primary',
    neutral: 'border-border bg-muted text-muted-foreground',
  };
</script>

<Badge variant="outline" class={'font-medium ' + toneClass[status] + ' ' + className}>{label}</Badge>
