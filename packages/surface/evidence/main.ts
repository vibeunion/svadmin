import { mount } from 'svelte';
import Demo from './Demo.svelte';
import '@svadmin/ui/app.css';
const target = document.getElementById('app');
if (!target) throw new Error('Missing evidence mount target');
if (new URLSearchParams(location.search).get('theme') === 'dark') document.documentElement.classList.add('dark');
mount(Demo, { target });
