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
    success: 'svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff',
    warning: 'svadmin-u-2f960aa0c478 svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab',
    danger: 'svadmin-u-9d5d8b4711b4 svadmin-u-43928fcc832f svadmin-u-811148b13d1e',
    info: 'svadmin-u-05f954a846d6 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1',
    neutral: 'svadmin-u-18049387f0af svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748',
  };
</script>

<Badge variant="outline" class={'svadmin-u-2689f3958069 ' + toneClass[status] + ' ' + className}>{label}</Badge>
