<script lang="ts">
  interface Props {
    value?: string | number | null;
    type?:
      | 'phone'
      | 'mobile'
      | 'id-card'
      | 'idCard'
      | 'email'
      | 'bank-card'
      | 'bankCard'
      | 'name'
      | 'secret'
      | 'custom';
    class?: string;
  }

  let {
    value = '',
    type = 'phone',
    class: className = '',
  }: Props = $props();

  const rawString = $derived(String(value ?? ''));

  function maskName(val: string): string {
    const trimmed = val.trim();
    if (!trimmed) return '—';
    if (trimmed.includes(' ')) {
      return trimmed
        .split(/\s+/)
        .map((part) => (part.length <= 1 ? '*' : `${part[0]}${'*'.repeat(Math.max(1, part.length - 2))}${part.length > 2 ? part.slice(-1) : '*'}`))
        .join(' ');
    }
    const len = trimmed.length;
    if (len <= 1) return '*';
    if (len === 2) return `${trimmed[0]}*`;
    if (len === 3) return `${trimmed[0]}*${trimmed[2]}`;
    return `${trimmed[0]}${'*'.repeat(len - 2)}${trimmed.slice(-1)}`;
  }

  function mask(val: string, maskType: string): string {
    if (!val) return '—';
    switch (maskType) {
      case 'phone':
      case 'mobile':
        return val.length >= 7 ? `${val.slice(0, 3)}****${val.slice(-4)}` : '****';
      case 'id-card':
      case 'idCard':
        return val.length >= 10 ? `${val.slice(0, 6)}********${val.slice(-4)}` : '********';
      case 'bank-card':
      case 'bankCard':
        return val.length >= 8 ? `${val.slice(0, 4)} **** **** ${val.slice(-4)}` : '**** ****';
      case 'name':
        return maskName(val);
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
