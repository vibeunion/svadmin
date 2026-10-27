import { mount } from 'svelte';
import '../../../../packages/ui/src/app.css';
import AutoFormUploadBrowserFixture from './AutoFormUploadBrowserFixture.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing AutoForm browser acceptance mount target');
mount(AutoFormUploadBrowserFixture, { target });
