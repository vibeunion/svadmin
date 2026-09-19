import { mount } from 'svelte';
import Advanced from './Advanced.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture target');
mount(Advanced, { target });
