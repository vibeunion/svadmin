import { mount } from 'svelte';
import '../../../packages/ui/src/app.css';
import App from './App.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing review fixture target');
mount(App, { target });
