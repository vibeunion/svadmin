import { cleanup, render, screen } from '@testing-library/svelte';
import type { Snippet } from 'svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AdvancedDetailTemplate from './AdvancedDetailTemplate.svelte';
import AdvancedFormTemplate from './AdvancedFormTemplate.svelte';
import AnalysisTemplate from './AnalysisTemplate.svelte';
import BasicDetailTemplate from './BasicDetailTemplate.svelte';
import CardListTemplate from './CardListTemplate.svelte';
import ExceptionTemplate from './ExceptionTemplate.svelte';
import GroupFormTemplate from './GroupFormTemplate.svelte';
import MonitorTemplate from './MonitorTemplate.svelte';
import MultiDimensionAnalysisTemplate from './MultiDimensionAnalysisTemplate.svelte';
import ProfileTemplate from './ProfileTemplate.svelte';
import ResultTemplate from './ResultTemplate.svelte';
import SearchTableTemplate from './SearchTableTemplate.svelte';
import StepFormTemplate from './StepFormTemplate.svelte';
import UserInfoTemplate from './UserInfoTemplate.svelte';
import UserSettingsTemplate from './UserSettingsTemplate.svelte';
import TemplatePageShell from './TemplatePageShell.svelte';
import WorkplaceTemplate from './WorkplaceTemplate.svelte';

afterEach(() => cleanup());

const body = createRawSnippet(() => ({ render: () => '<p>Sample content</p>' }));
const stepContent = createRawSnippet(() => ({ render: () => '<p>Step</p>' })) as unknown as Snippet<[number]>;
const steps = [{ title: 'Basics' }, { title: 'Review' }];

function heading(name: string): void {
  expect(screen.getByRole('heading', { name })).toBeTruthy();
}

describe('page templates', () => {
  it('renders every composition with its primary content', () => {
    render(TemplatePageShell, { props: { title: 'Composition', primary: body } });
    heading('Composition');
    cleanup();

    render(WorkplaceTemplate, { props: { title: 'Workplace', primary: body, secondary: body } });
    heading('Workplace');
    cleanup();

    render(MonitorTemplate, { props: { title: 'Monitor', metrics: body, chart: body } });
    heading('Monitor');
    cleanup();

    render(AnalysisTemplate, { props: { title: 'Analysis', charts: body, records: body } });
    heading('Analysis');
    cleanup();

    render(MultiDimensionAnalysisTemplate, { props: { title: 'Multi-dimension analysis', chart: body, dimensions: body, breakdown: body, insights: body } });
    heading('Multi-dimension analysis');
    cleanup();

    render(SearchTableTemplate, { props: { title: 'Search table', table: body } });
    heading('Search table');
    cleanup();

    render(CardListTemplate, { props: { title: 'Card list', items: body } });
    heading('Card list');
    cleanup();

    render(GroupFormTemplate, { props: { title: 'Group form', form: body } });
    heading('Group form');
    cleanup();

    render(StepFormTemplate, { props: { title: 'Step form', steps, stepContent } });
    heading('Step form');
    cleanup();

    render(AdvancedFormTemplate, { props: { title: 'Advanced form', form: body, summary: body } });
    heading('Advanced form');
    cleanup();

    render(BasicDetailTemplate, { props: { title: 'Basic detail', details: body } });
    heading('Basic detail');
    cleanup();

    render(AdvancedDetailTemplate, { props: { title: 'Advanced detail', details: body, activity: body } });
    heading('Advanced detail');
    cleanup();

    render(ProfileTemplate, { props: { title: 'Profile', profile: body, activity: body } });
    heading('Profile');
    cleanup();

    render(ResultTemplate, { props: { status: 'success', title: 'Success' } });
    heading('Success');
    cleanup();

    render(ExceptionTemplate, { props: { status: 404 } });
    heading('Page not found');
  });

  it('renders the Arco Pro page-depth slots', () => {
    render(WorkplaceTemplate, { props: { title: 'Workplace', primary: body, secondary: body, media: body, shortcuts: body, announcements: body, docs: body } });
    heading('Workplace');
    cleanup();

    render(MonitorTemplate, { props: { title: 'Monitor', metrics: body, chart: body, activity: body, status: body, quickOperations: body, information: body } });
    heading('Monitor');
    cleanup();

    render(SearchTableTemplate, { props: { title: 'Search table', filters: body, bulkActions: body, table: body, pagination: body, footer: body } });
    heading('Search table');
    cleanup();

    render(CardListTemplate, { props: { title: 'Card list', tabs: body, filters: body, addCard: body, items: body } });
    heading('Card list');
    cleanup();

    render(BasicDetailTemplate, { props: { title: 'Basic detail', steps: body, details: body, summary: body, history: body } });
    heading('Basic detail');
    cleanup();

    render(UserInfoTemplate, { props: { title: 'User info', header: body, projects: body, news: body, team: body } });
    heading('User info');
    cleanup();

    render(UserSettingsTemplate, { props: { title: 'User settings', basic: body, security: body, verification: body } });
    heading('User settings');
  });
});