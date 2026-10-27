import { mount } from 'svelte';
import '../../../../packages/ui/src/app.css';
import AutoFormRecordBrowserFixture from './AutoFormRecordBrowserFixture.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing AutoForm record browser acceptance mount target');
mount(AutoFormRecordBrowserFixture, { target });
