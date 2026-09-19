import { mount } from 'svelte';
import Surface from './Surface.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture target');
mount(Surface, { target });
