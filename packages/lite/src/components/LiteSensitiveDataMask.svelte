<script lang="ts">
  interface Props {
    value?: string | number | null;
    type?: 'phone' | 'id-card' | 'email' | 'bank-card' | 'secret' | 'custom';
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    value = '',
    type = 'phone',
    class: className = '',
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
        const [name, domain] = parts;
        return parts.length === 2 && name && domain ? `${name.slice(0, 1)}***@${domain}` : '***@***.***';
      }
      default:
        return '••••••••';
    }
  }

  const masked = $derived(mask(rawString, type));
</script>

<span class="lite-sensitive-mask {className}" style="font-family: monospace; font-size: 12px;">
  {masked}
</span>
