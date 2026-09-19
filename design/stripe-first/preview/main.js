import { mount } from 'svelte';
import '../../../packages/ui/dist/app.css';
import './preview.css';
import './scroll.css';
import Preview from './Preview.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing preview root');
mount(Preview, { target });
