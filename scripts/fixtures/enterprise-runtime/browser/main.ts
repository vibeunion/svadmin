import { mount } from 'svelte';
import '../../../../packages/ui/src/app.css';
import UploadBrowserFixture from './UploadBrowserFixture.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing browser acceptance mount target');
mount(UploadBrowserFixture, { target });
