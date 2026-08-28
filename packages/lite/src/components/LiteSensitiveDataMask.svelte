<script lang="ts">
  interface Props {
    value?: string | number | null;
    type?: 'phone' | 'id-card' | 'email' | 'bank-card' | 'secret' | 'custom';
  }

  let {
    value = '',
    type = 'phone',
  }: Props = $props();

  const rawString = $derived(String(value ?? ''));

  function mask(val: string, maskType: string): string {
    if (!val) return '—';
    switch (maskType) {
      case 'phone':
        return val.length >= 7 ? `${val.slice(0, 3)}****${val.slice(-4)}` : '****';
      case 'id-card':
        return val.length >= 10 ? `${val.slice(0, 6)}********${val.slice(-4)}` : '********';
      case 'email': {
        const parts = val.split('@');
        return parts.length === 2 ? `${parts[0].slice(0, 1)}***@${parts[1]}` : '***@***.***';
      }
      default:
        return '••••••••';
    }
  }

  const masked = $derived(mask(rawString, type));
</script>

<span class="lite-sensitive-mask" style="font-family: monospace; font-size: 12px;">
  {masked}
</span>
