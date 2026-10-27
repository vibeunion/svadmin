import { mount } from 'svelte';
import '../../../../packages/ui/src/app.css';
import ResourceWorkspaceBrowserFixture from './ResourceWorkspaceBrowserFixture.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing workspace browser acceptance mount target');
mount(ResourceWorkspaceBrowserFixture, { target });
