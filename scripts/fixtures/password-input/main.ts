import { mount } from 'svelte';
import '../../../packages/ui/dist/app.css';
import Host from '../../../packages/ui/test/fixtures/PasswordInputHost.svelte';

const target = document.querySelector('#app');
if (!target) throw new Error('Missing fixture root');
const params = new URLSearchParams(location.search);
mount(Host, {
  target,
  props: {
    cleanFlat: params.get('preset') === 'clean-flat',
    nested: params.get('nested') === 'true',
    direction: params.get('dir') === 'rtl' ? 'rtl' : 'ltr',
    showStrength: true,
  },
});
