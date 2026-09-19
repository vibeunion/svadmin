import { mount } from 'svelte';
import App from './App.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing fixture target');
mount(App, { target });
