/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TaskQueueDrawer from './TaskQueueDrawer.svelte';

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
    return [...taskFixtures, ...dlqFixtures].find((task) => task.id === taskId) ?? taskFixtures[0];
  }),
  list: vi.fn(async () => ({ data: taskFixtures, total: taskFixtures.length })),
  listDlq: vi.fn(async () => ({ data: dlqFixtures, total: dlqFixtures.length })),
  retry: vi.fn(async () => undefined),
  cancel: vi.fn(async () => undefined),
};

const refetchTasks = vi.fn(async () => ({ data: { data: taskFixtures, total: taskFixtures.length } }));
const refetchDlq = vi.fn(async () => ({ data: { data: dlqFixtures, total: dlqFixtures.length } }));
const mutateAsync = vi.fn(async (params: any) => ({
  id: `submitted-${params.taskName}`,
  wait: async () => ({
    id: `submitted-${params.taskName}`,
    name: params.taskName,
    status: 'queued',
  }),
}));

vi.mock('@svadmin/core', () => ({
  captureAdminContext: () => ({
    taskProvider: mockTaskProvider,
    matchesTenantQuery: () => true,
  }),
  getTaskProvider: () => mockTaskProvider,
  useTaskList: ({ dlq }: { dlq?: boolean }) => ({
    data: dlq
      ? { data: dlqFixtures, total: dlqFixtures.length }
      : { data: taskFixtures, total: taskFixtures.length },
    isLoading: false,
      refetch: dlq ? refetchDlq : refetchTasks,
  }),
  useTask: ({ taskId }: { taskId?: string }) => ({
    data: [...taskFixtures, ...dlqFixtures].find((task) => task.id === taskId) ?? taskFixtures[0],
    isLoading: false,
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
  });

  it('supports tab switching, filtering, and detail selection', async () => {
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });

    expect(screen.getByText('Task Center')).toBeTruthy();
    expect(screen.getAllByText('Generate poster').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rendering hero artwork').length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText('Filter tasks by name, ID, status, or message...');
    await fireEvent.input(searchInput, { target: { value: 'email' } });

    await waitFor(() => {
      expect(screen.queryAllByText('Generate poster').length).toBeLessThan(2);
    });
    expect(screen.getByText('Send email batch')).toBeTruthy();

    await fireEvent.input(searchInput, { target: { value: '' } });
    await fireEvent.click(screen.getByRole('tab', { name: /DLQ/i }));

    expect(screen.getByText('Nightly sync')).toBeTruthy();

    const dlqRow = screen.getByText('Nightly sync').closest('tr');
    expect(dlqRow).toBeTruthy();
    await fireEvent.click(dlqRow!);

    await waitFor(() => {
      expect(screen.getAllByText('Remote API timeout').length).toBeGreaterThan(0);
    });
  });

  it('submits a task from the inline form', async () => {
    render(TaskQueueDrawer, { open: true, taskProvider: mockTaskProvider });

    await fireEvent.click(screen.getAllByRole('button', { name: 'Submit Task' })[0]);

    await fireEvent.input(screen.getByLabelText('Task name'), {
      target: { value: 'image.generate' },
    });
    await fireEvent.input(screen.getByLabelText('Task payload (JSON)'), {
      target: { value: '{"prompt":"poster"}' },
    });

    const submitButtons = screen.getAllByRole('button', { name: 'Submit Task' });
    await fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        taskName: 'image.generate',
        taskProvider: mockTaskProvider,
        options: {
          body: { prompt: 'poster' },
          idempotencyKey: undefined,
        },
      });
    });
  });
});
