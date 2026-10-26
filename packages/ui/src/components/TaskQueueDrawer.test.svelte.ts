import { requireValue } from "../../../../scripts/test-assertions";
import type { TaskProvider, TaskRecord, UseSubmitTaskMutateParams } from '@svadmin/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import TaskQueueDrawer from './TaskQueueDrawer.svelte';
import LazyTaskQueueDrawer from './LazyTaskQueueDrawer.svelte';
import TaskList from './TaskList.svelte';
import TaskDetails from './TaskDetails.svelte';
import { formatTaskDate, normalizeTaskStatus } from './task-utils';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';
import { exactRoleName } from '../../test/accessible-name';
import { SvelteSet } from 'svelte/reactivity';

const taskFixtures = [
  {
    id: 'task-1',
    name: 'Generate poster',
    status: 'processing',
    message: 'Rendering hero artwork',
    created_at: '2026-04-19T10:00:00.000Z',
    updated_at: '2026-04-19T10:05:00.000Z',
    progress: 42,
  },
  {
    id: 'task-2',
    name: 'Send email batch',
    status: 'queued',
    message: 'Waiting for worker',
    created_at: '2026-04-19T10:10:00.000Z',
    updated_at: '2026-04-19T10:12:00.000Z',
  },
];

const dlqFixtures = [
  {
    id: 'task-dlq-1',
    name: 'Nightly sync',
    status: 'dead_lettered',
    error_message: 'Remote API timeout',
    created_at: '2026-04-18T23:00:00.000Z',
    updated_at: '2026-04-18T23:05:00.000Z',
    result_data: { reason: 'Remote API timeout' },
  },
];

const mockTaskProvider = {
  submit: vi.fn(async () => ({
    id: 'submitted-image.generate',
    wait: async () => ({
      id: 'submitted-image.generate',
      name: 'image.generate',
      status: 'queued',
      created_at: '2026-04-19T11:00:00.000Z',
      updated_at: '2026-04-19T11:00:00.000Z',
    }),
  })),
  get: vi.fn(async (taskId: string) => {
    return requireValue([...taskFixtures, ...dlqFixtures].find((task) => task.id === taskId));
  }),
  list: vi.fn(async () => ({ data: taskFixtures, total: taskFixtures.length })),
  listDlq: vi.fn(async () => ({ data: dlqFixtures, total: dlqFixtures.length })),
  retry: vi.fn(async (id: string) => ({ id, status: 'pending' })),
  cancel: vi.fn(async (id: string) => ({ id, status: 'cancelled' })),
};

type RefetchList = () => Promise<{ data: { data: TaskRecord[]; total: number } }>;
const refetchTasks = vi.fn<RefetchList>(async () => ({ data: { data: taskFixtures, total: taskFixtures.length } }));
const refetchDlq = vi.fn<RefetchList>(async () => ({ data: { data: dlqFixtures, total: dlqFixtures.length } }));
const failedLists = new SvelteSet<'tasks' | 'dlq'>();
const detailState = new SvelteSet<'error' | 'fetching' | 'loading'>();
const refetchDetail = vi.fn(async (id: string | undefined, _options?: { cancelRefetch?: boolean }) => ({
  data: [...taskFixtures, ...dlqFixtures].find(task => task.id === id),
}));
let taskListLoading = false;
let taskListFetching = false;
type ListQueryOptions = {
  dlq?: boolean;
  queryOptions?: { enabled?: boolean };
};
const listQueryOptions: ListQueryOptions[] = [];
const mutateAsync = vi.fn(async (params: UseSubmitTaskMutateParams) => ({
  id: `submitted-${params.taskName}`,
  wait: async () => ({
    id: `submitted-${params.taskName}`,
    name: params.taskName,
    status: 'queued',
  }),
}));

vi.mock('@svadmin/core', async importOriginal => ({
  ...await importOriginal<typeof import('@svadmin/core')>(),
  captureAdminContext: () => ({
    taskProvider: mockTaskProvider,
  }),
  getTaskProvider: () => mockTaskProvider,
  useTaskList: (options: ListQueryOptions) => {
    listQueryOptions.push(options);
    const { dlq } = options;
    return {
    data: dlq
      ? { data: dlqFixtures, total: dlqFixtures.length }
      : { data: taskFixtures, total: taskFixtures.length },
    get isError() { return failedLists.has(dlq ? 'dlq' : 'tasks'); },
    isLoading: taskListLoading,
    isFetching: taskListFetching,
    refetch: dlq ? refetchDlq : refetchTasks,
    };
  },
  useTask: (options: { taskId?: string }) => ({
    get data() {
      return [...taskFixtures, ...dlqFixtures].find((task) => task.id === options.taskId) ?? taskFixtures[0];
    },
    get isError() { return detailState.has('error'); },
    get isLoading() { return detailState.has('loading'); },
    get isFetching() { return detailState.has('fetching'); },
    refetch: (refetchOptions?: { cancelRefetch?: boolean }) => refetchDetail(options.taskId, refetchOptions),
  }),
  useSubmitTask: () => ({
    mutation: {
      mutateAsync,
      isPending: false,
    },
  }),
}));

vi.mock('@tanstack/svelte-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(async () => undefined),
  }),
}));

describe('TaskQueueDrawer', () => {
  beforeEach(() => {
    refetchTasks.mockClear();
    refetchDlq.mockClear();
    mutateAsync.mockClear();
    mockTaskProvider.submit.mockClear();
    mockTaskProvider.get.mockClear();
    mockTaskProvider.list.mockClear();
    mockTaskProvider.listDlq.mockClear();
    mockTaskProvider.retry.mockClear();
    mockTaskProvider.cancel.mockClear();
    failedLists.clear();
    detailState.clear();
    refetchDetail.mockReset();
    refetchDetail.mockImplementation(async id => ({
      data: [...taskFixtures, ...dlqFixtures].find(task => task.id === id),
    }));
    taskListLoading = false;
    taskListFetching = false;
    listQueryOptions.length = 0;
  });

  it('loads the default task center with its current props and open state', async () => {
    const view = render(LazyTaskQueueDrawer, {
      open: true, taskProvider: mockTaskProvider, title: 'Scoped task center', initialTab: 'dlq',
    });
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Scoped task center' })).toBeTruthy());
    expect(screen.getByRole('tab', { name: /DLQ/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByText('Nightly sync').length).toBeGreaterThan(0);
    await view.rerender({ open: false });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Scoped task center' })).toBeNull());
    await fireEvent.click(screen.getByRole('button', { name: 'Scoped task center' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Scoped task center' })).toBeTruthy());
  });

  it('supports tab switching, filtering, and detail selection', async () => {
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });

    expect(screen.getByRole('dialog', { name: 'Task Center' })).toBeTruthy();
    expect(screen.getAllByText('Generate poster').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rendering hero artwork').length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText('Filter tasks by name, ID, status, or message...');
    await fireEvent.input(searchInput, { target: { value: 'email' } });

    await waitFor(() => {
      expect(screen.queryAllByText('Generate poster').length).toBeLessThan(2);
    });
    expect(within(screen.getByRole('table')).getByText('Send email batch')).toBeTruthy();

    await fireEvent.input(searchInput, { target: { value: '' } });
    await fireEvent.click(screen.getByRole('tab', { name: /DLQ/i }));

    expect(within(screen.getByRole('table')).getByText('Nightly sync')).toBeTruthy();

    const dlqRow = within(screen.getByRole('table')).getByText('Nightly sync').closest('tr');
    expect(dlqRow).toBeTruthy();
    await fireEvent.click(requireValue(dlqRow));

    await waitFor(() => {
      expect(screen.getAllByText('Remote API timeout').length).toBeGreaterThan(0);
    });
  });

  it.each(['tasks', 'dlq'] as const)('distinguishes missing %s capability from empty data and recovers after provider replacement', async tab => {
    const provider: TaskProvider = { ...mockTaskProvider };
    if (tab === 'tasks') delete provider.list;
    else delete provider.listDlq;
    const view = render(TaskQueueDrawer, { open: true, taskProvider: provider, initialTab: tab });
    const queryOptions = requireValue(listQueryOptions.find(options => !!options.dlq === (tab === 'dlq')));
    expect(queryOptions.queryOptions?.enabled).toBe(false);
    expect(screen.getByRole('alert').textContent).toContain(
      tab === 'tasks'
        ? 'The current task service does not provide a task list.'
        : 'The current task service does not provide a dead-letter list.',
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Generate poster')).toBeNull();
    expect(screen.queryByText('Nightly sync')).toBeNull();
    expect(screen.queryByText(tab === 'tasks' ? 'No tasks found' : 'No dead-letter tasks')).toBeNull();
    expect(screen.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    expect(screen.getByRole('tab', { name: tab === 'tasks' ? /^Tasks$/ : /^DLQ$/ })).toBeTruthy();
    const refresh = screen.getByRole('button', { name: exactRoleName('Refresh') });
    expect(refresh.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('combobox', { name: 'Auto refresh' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(refresh);
    expect(refetchTasks).not.toHaveBeenCalled();
    expect(refetchDlq).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: exactRoleName('Submit Task') }).hasAttribute('disabled')).toBe(false);
    await view.rerender({ taskProvider: mockTaskProvider });
    expect(queryOptions.queryOptions?.enabled).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Auto refresh' }).hasAttribute('disabled')).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Refresh') }));
    expect(tab === 'tasks' ? refetchTasks : refetchDlq).toHaveBeenCalledExactlyOnceWith({ cancelRefetch: false });
    await view.rerender({ taskProvider: provider });
    expect(queryOptions.queryOptions?.enabled).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Auto refresh' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('offers a local retry action when the provider list fails', async () => {
    failedLists.add('tasks');
    render(TaskList, { taskProvider: mockTaskProvider, useProviderData: true });
    expect(screen.getByRole('alert')).toBeTruthy();
    const retry = screen.getByRole('button', { name: 'Retry' });
    await fireEvent.click(retry);
    expect(refetchTasks).toHaveBeenCalledOnce();
    expect(mockTaskProvider.retry).not.toHaveBeenCalled();
    expect(mockTaskProvider.cancel).not.toHaveBeenCalled();
  });

  it.each(['tasks', 'dlq'] as const)('shows the %s query failure instead of stale rows and retries only that list', async tab => {
    failedLists.add(tab);
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider, initialTab: tab });
    expect(screen.getByRole('alert').textContent).toContain('Fetch tasks failed');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Generate poster')).toBeNull();
    expect(screen.queryByText('Nightly sync')).toBeNull();
    expect(screen.queryByText('No tasks found')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    expect(tab === 'tasks' ? refetchTasks : refetchDlq).toHaveBeenCalledExactlyOnceWith({ cancelRefetch: false });
    expect(tab === 'tasks' ? refetchDlq : refetchTasks).not.toHaveBeenCalled();
    expect(mockTaskProvider.retry).not.toHaveBeenCalled();
    expect(mockTaskProvider.cancel).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('tab', { name: tab === 'tasks' ? /DLQ/i : /^Tasks/i }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('shows a loading state rather than empty or stale rows while the drawer is loading', () => {
    taskListLoading = true;
    taskListFetching = true;
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
    expect(screen.getByRole('status', { name: 'Loading tasks...' }).getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Generate poster')).toBeNull();
    expect(screen.getByRole('button', { name: 'Refresh' }).hasAttribute('disabled')).toBe(true);
  });

  it.each(['list', 'drawer'] as const)('does not offer another read retry while %s is fetching', async owner => {
    failedLists.add('tasks');
    taskListFetching = true;
    if (owner === 'list') render(TaskList, { taskProvider: mockTaskProvider, useProviderData: true });
    else render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    if (owner === 'drawer') {
      await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    }
    expect(refetchTasks).not.toHaveBeenCalled();
    expect(refetchDlq).not.toHaveBeenCalled();
  });

  it.each(['list', 'tasks', 'dlq'] as const)('restores %s records after a read retry succeeds', async owner => {
    const tab = owner === 'dlq' ? 'dlq' : 'tasks';
    failedLists.add(tab);
    let finish = () => {};
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const refetch = tab === 'dlq' ? refetchDlq : refetchTasks;
    refetch.mockImplementationOnce(async () => {
      await pending;
      failedLists.delete(tab);
      const data = tab === 'dlq' ? dlqFixtures : taskFixtures;
      return { data: { data, total: data.length } };
    });
    if (owner === 'list') render(TaskList, { taskProvider: mockTaskProvider, useProviderData: true });
    else render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider, initialTab: tab });
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { finish(); await pending; });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(within(screen.getByRole('table')).getByText(tab === 'dlq' ? 'Nightly sync' : 'Generate poster')).toBeTruthy();
    expect(refetch).toHaveBeenCalledOnce();
    expect(mockTaskProvider.retry).not.toHaveBeenCalled();
    expect(mockTaskProvider.cancel).not.toHaveBeenCalled();
  });

  it.each(['list', 'details', 'drawer'] as const)('updates %s timestamps with the application language without submitting or refetching', async owner => {
    const view = owner === 'list'
      ? renderWithI18n(TaskList, { tasks: taskFixtures, taskProvider: mockTaskProvider })
      : owner === 'details'
        ? renderWithI18n(TaskDetails, { task: requireValue(taskFixtures[0]), useProviderData: false })
        : renderWithI18n(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
    const value = owner === 'list' ? '2026-04-19T10:05:00.000Z' : '2026-04-19T10:00:00.000Z';
    const expected = (locale: string) => new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium', timeStyle: 'medium',
    }).format(new Date(value));
    const content = () => document.body.textContent ?? '';
    expect(content()).toContain(expected('en'));
    await view.wrapper.setLocale('zh-CN');
    expect(content()).toContain(expected('zh-CN'));
    expect(content()).not.toContain(expected('en'));
    await view.wrapper.setLocale('en');
    expect(content()).toContain(expected('en'));
    expect(refetchTasks).not.toHaveBeenCalled();
    expect(refetchDlq).not.toHaveBeenCalled();
    expect(refetchDetail).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', 'not-a-date', '2026-02-30', 0])('shows the date placeholder for %s', value => {
    expect(formatTaskDate(value, 'en')).toBe('\u2014');
  });

  it('preserves civil date values and safely falls back for an invalid locale', () => {
    expect(formatTaskDate('2026-01-01T00:01:02', 'en')).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' })
        .format(new Date('2026-01-01T00:01:02Z')),
    );
    expect(formatTaskDate('2026-01-01', 'en')).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' })
        .format(new Date('2026-01-01T00:00:00Z')),
    );
    expect(formatTaskDate('2026-01-01T00:01:02', 'invalid_locale')).toBe('2026-01-01T00:01:02');
  });

  it('keeps instants in the host timezone across a UTC day boundary', () => {
    const value = '2026-01-01T00:01:02Z';
    const date = new Date(value);
    const options = { dateStyle: 'medium', timeStyle: 'medium' } as const;
    const local = new Intl.DateTimeFormat('en', options).format(date);
    expect(formatTaskDate(value, 'en')).toBe(local);
    expect(formatTaskDate('2025-12-31T16:01:02-08:00', 'en')).toBe(local);
    if (date.getTimezoneOffset() !== 0) {
      const utc = new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(date);
      expect(formatTaskDate(value, 'en')).not.toBe(utc);
    }
    if (process.env['TZ'] === 'America/Los_Angeles') {
      expect(formatTaskDate(value, 'en')).toContain('Dec 31, 2025');
    }
  });

  it('submits a task from the inline form', async () => {
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });

    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));

    await fireEvent.input(screen.getByLabelText('Task name'), {
      target: { value: 'image.generate' },
    });
    await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), {
      target: { value: '{"prompt":"poster"}' },
    });

    const submitButtons = screen.getAllByRole('button', { name: 'Submit Task' });
    await fireEvent.click(requireValue(submitButtons[submitButtons.length - 1]));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        taskName: 'image.generate',
        taskProvider: mockTaskProvider,
        options: {
          body: { prompt: 'poster' },
        },
      });
    });
    await waitFor(() => expect(refetchTasks).toHaveBeenCalledOnce());
    expect(refetchDlq).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('Task name')).toBeNull();
  });

  it.each(['tasks', 'dlq', 'neither'] as const)('refreshes only supported queues after submission (%s)', async capability => {
    const provider: TaskProvider = {
      submit: mockTaskProvider.submit,
      get: mockTaskProvider.get,
      ...(capability === 'tasks' ? { list: mockTaskProvider.list } : {}),
      ...(capability === 'dlq' ? { listDlq: mockTaskProvider.listDlq } : {}),
    };
    render(TaskQueueDrawer, { open: true, taskProvider: provider });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
    await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'image.generate' } });
    await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), { target: { value: '{}' } });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' }).at(-1)));
    await waitFor(() => expect(screen.queryByLabelText('Task name')).toBeNull());
    expect(mutateAsync).toHaveBeenCalledOnce();
    expect(refetchTasks).toHaveBeenCalledTimes(capability === 'tasks' ? 1 : 0);
    expect(refetchDlq).toHaveBeenCalledTimes(capability === 'dlq' ? 1 : 0);
    expect(screen.queryByText('Task submission failed')).toBeNull();
  });

  it('does not reinterpret failed post-submit reads as a failed submission', async () => {
    refetchTasks.mockRejectedValueOnce(new Error('PRIVATE_LIST_REFRESH'));
    refetchDlq.mockRejectedValueOnce(new Error('PRIVATE_DLQ_REFRESH'));
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
    await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'image.generate' } });
    await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), { target: { value: '{}' } });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' }).at(-1)));
    await waitFor(() => expect(refetchTasks).toHaveBeenCalledOnce());
    expect(refetchDlq).toHaveBeenCalledOnce();
    await act(async () => { await Promise.allSettled([refetchTasks.mock.results[0]?.value, refetchDlq.mock.results[0]?.value]); });
    expect(screen.queryByLabelText('Task name')).toBeNull();
    expect(screen.queryByText('Task submission failed')).toBeNull();
    expect(document.body.textContent).not.toContain('PRIVATE_LIST_REFRESH');
    expect(document.body.textContent).not.toContain('PRIVATE_DLQ_REFRESH');
    expect(mutateAsync).toHaveBeenCalledOnce();
  });

  it.each(['diagnostic', 'empty', 'non-error'] as const)('sanitizes %s task submission failures and permits retry', async failure => {
    mutateAsync
      .mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE_TASK_SUBMIT_DIAGNOSTIC' : new Error(failure === 'empty' ? '' : 'PRIVATE_TASK_SUBMIT_DIAGNOSTIC'))
      .mockResolvedValueOnce({
        id: 'submitted-image.generate',
        wait: async () => ({ id: 'submitted-image.generate', name: 'image.generate', status: 'queued' }),
      });
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
    await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'image.generate' } });
    await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), { target: { value: '{"prompt":"poster"}' } });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' }).at(-1)));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveProperty('textContent', 'Task submission failed'));
    expect(document.body.textContent).not.toContain('PRIVATE_TASK_SUBMIT_DIAGNOSTIC');
    expect(screen.getByLabelText('Task name')).toHaveProperty('value', 'image.generate');
    expect(screen.getByLabelText('Task payload (JSON)')).toHaveProperty('value', '{"prompt":"poster"}');
    expect(refetchTasks).not.toHaveBeenCalled();
    expect(refetchDlq).not.toHaveBeenCalled();
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' }).at(-1)));
    await waitFor(() => expect(screen.queryByLabelText('Task name')).toBeNull());
    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync).toHaveBeenLastCalledWith({
      taskName: 'image.generate',
      taskProvider: mockTaskProvider,
      options: { body: { prompt: 'poster' } },
    });
    await waitFor(() => expect(refetchTasks).toHaveBeenCalledOnce());
    expect(refetchDlq).toHaveBeenCalledOnce();
  });

  it('retries a failed detail read without exposing cached task content or executing the task', async () => {
    detailState.add('error');
    render(TaskDetails, { taskId: 'task-1', taskProvider: mockTaskProvider });
    expect(screen.getByRole('alert').textContent).toContain('Fetch task failed');
    expect(screen.queryByText('Generate poster')).toBeNull();
    expect(screen.queryByText('Rendering hero artwork')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    expect(refetchDetail).toHaveBeenCalledExactlyOnceWith('task-1', { cancelRefetch: false });
    expect(mockTaskProvider.retry).not.toHaveBeenCalled();
    expect(mockTaskProvider.cancel).not.toHaveBeenCalled();
  });

  it('restores task detail after its read retry succeeds', async () => {
    detailState.add('error');
    refetchDetail.mockImplementationOnce(async id => {
      detailState.delete('error');
      return { data: taskFixtures.find(task => task.id === id) };
    });
    render(TaskDetails, { taskId: 'task-1', taskProvider: mockTaskProvider });
    await fireEvent.click(screen.getByRole('button', { name: exactRoleName('Retry') }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText('Generate poster')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(refetchDetail).toHaveBeenCalledOnce();
    expect(mockTaskProvider.cancel).not.toHaveBeenCalled();
  });

  it('shows detail loading rather than stale content or a no-selection message', () => {
    detailState.add('loading');
    detailState.add('fetching');
    render(TaskDetails, { taskId: 'task-1', taskProvider: mockTaskProvider });
    expect(screen.getByRole('status', { name: 'Loading task...' }).getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('Generate poster')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('does not offer duplicate detail retries while fetching', () => {
    detailState.add('error');
    detailState.add('fetching');
    render(TaskDetails, { taskId: 'task-1', taskProvider: mockTaskProvider });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    expect(refetchDetail).not.toHaveBeenCalled();
  });

  it('keeps a direct valid task independent of a failed unused detail query', () => {
    detailState.add('error');
    render(TaskDetails, { task: { id: 'direct', title: 'Direct task' }, useProviderData: false });
    expect(screen.getByText('Direct task')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(refetchDetail).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'missing-id'] as const)('does not expose a detail read retry for %s queries', condition => {
    detailState.add('error');
    render(TaskDetails, {
      ...(condition === 'missing-id' ? {} : { taskId: 'task-1' }),
      taskProvider: mockTaskProvider,
      useProviderData: true,
      queryOptions: { enabled: condition !== 'disabled' },
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    expect(refetchDetail).not.toHaveBeenCalled();
  });

  it.each(['provider', 'form', 'drawer', 'unmount'] as const)(
    'ignores a delayed submission after changing the %s scope', async (scope) => {
      let finish = () => {};
      const pending = new Promise<void>(resolve => { finish = resolve; });
      mutateAsync.mockImplementationOnce(async () => {
        await pending;
        return { id: 'old-result', wait: async () => ({ id: 'old-result', name: 'old', status: 'queued' }) };
      });
      const view = render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
      await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
      await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'old' } });
      await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), { target: { value: '{}' } });
      await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' }).at(-1)));
      await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
      if (scope === 'provider') await view.rerender({ taskProvider: { ...mockTaskProvider } });
      if (scope === 'form') await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Cancel' })[0]));
      if (scope === 'drawer') {
        await view.rerender({ open: false });
        await view.rerender({ open: true });
      }
      if (scope === 'unmount') view.unmount();
      else {
        await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
        await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'new-draft' } });
      }
      await act(async () => { finish(); await pending; });
      expect(refetchTasks).not.toHaveBeenCalled();
      expect(refetchDlq).not.toHaveBeenCalled();
      if (scope !== 'unmount') expect(screen.getByDisplayValue('new-draft')).toBeTruthy();
    },
  );

  it('does not show a previous provider submission error in the new form', async () => {
    let finish = () => {};
    const pending = new Promise<void>(resolve => { finish = resolve; });
    mutateAsync.mockImplementationOnce(async () => {
      await pending;
      throw new Error('Old provider error');
    });
    const view = render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
    await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'old' } });
    await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), { target: { value: '{}' } });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' }).at(-1)));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    await view.rerender({ taskProvider: { ...mockTaskProvider } });
    await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
    await act(async () => { finish(); await pending; });
    expect(screen.queryByText('Old provider error')).toBeNull();
    expect(screen.getByLabelText('Task name')).toBeTruthy();
  });

  for (const payload of ['null', '[]', '42', '"secret"', '{"amount":1e400}']) {
    it(`rejects non-record or non-finite JSON input: ${payload}`, async () => {
      render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });
      await fireEvent.click(requireValue(screen.getAllByRole('button', { name: 'Submit Task' })[0]));
      await fireEvent.input(screen.getByLabelText('Task name'), { target: { value: 'function' } });
      await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), { target: { value: payload } });
      const buttons = screen.getAllByRole('button', { name: 'Submit Task' });
      await fireEvent.click(requireValue(buttons.at(-1)));
      expect(mutateAsync).not.toHaveBeenCalled();
      expect(screen.getByText('Task payload must be valid JSON')).toBeTruthy();
    });
  }

  it('rejects malformed direct task props and recovers after a valid update', async () => {
    const task = { id: 'task-1', title: 'Private invalid task', progress: 10 };
    Reflect.set(task, 'progress', 'secret-progress');
    const view = render(TaskDetails, { task, useProviderData: false });
    expect(screen.getByRole('alert').textContent).toBe('Invalid format');
    expect(screen.queryByText('Private invalid task')).toBeNull();
    expect(screen.queryByText('secret-progress')).toBeNull();
    await view.rerender({ task: { id: 'task-1', title: 'Valid task' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByText('Valid task').length).toBeGreaterThan(0);
    await view.rerender({ task, taskId: 'other-task' });
    expect(screen.getByRole('alert').textContent).toBe('Invalid format');
  });

  it('rejects malformed direct list props without partially rendering invalid data', () => {
    const task = { id: 'task-1', title: 'Private invalid task', progress: 10 };
    Reflect.set(task, 'progress', 'secret-progress');
    render(TaskList, { tasks: [task], useProviderData: false });
    expect(screen.getByRole('alert').textContent).toBe('Invalid format');
    expect(screen.queryByText('Private invalid task')).toBeNull();
  });

  it('does not resolve prototype keys or execute status coercion', () => {
    expect(normalizeTaskStatus('constructor')).toBe('unknown');
    expect(normalizeTaskStatus('__proto__')).toBe('unknown');
    expect(normalizeTaskStatus({ toString() { throw new Error('secret'); } })).toBe('unknown');
  });
});
