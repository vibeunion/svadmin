import { flushSync } from 'svelte';
import { afterEach, describe, expect, test } from 'vitest';
import type { AgentProvider, ChatProvider } from './chatProvider.svelte';
import {
  getAgentProvider,
  getChatContext,
  getChatProvider,
  hasPendingApprovals,
  registerApproval,
  resetChatProvider,
  setAgentProvider,
  setChatContext,
  setChatProvider,
} from './chatProvider.svelte';

const provider: ChatProvider = {
  sendMessage: async () => '',
};

const agentProvider: AgentProvider = {
  async *chat() {
    yield { type: 'done' };
  },
};

afterEach(() => resetChatProvider());

describe('chat provider Svelte 5 reactivity', () => {
  test('tracks each module singleton independently through runes', () => {
    const providerSnapshots: boolean[] = [];
    const agentSnapshots: boolean[] = [];
    const approvalSnapshots: boolean[] = [];
    const contextSnapshots: Array<string | undefined> = [];
    const dispose = $effect.root(() => {
      $effect(() => {
        providerSnapshots.push(getChatProvider() !== null);
      });
      $effect(() => {
        agentSnapshots.push(getAgentProvider() !== null);
      });
      $effect(() => {
        approvalSnapshots.push(hasPendingApprovals());
      });
      $effect(() => {
        contextSnapshots.push(getChatContext().currentResource);
      });
    });

    flushSync();
    expect(providerSnapshots).toEqual([false]);
    expect(agentSnapshots).toEqual([false]);
    expect(approvalSnapshots).toEqual([false]);
    expect(contextSnapshots).toEqual([undefined]);

    setChatProvider(provider);
    flushSync();
    expect(providerSnapshots).toEqual([false, true]);
    expect(agentSnapshots).toEqual([false]);
    expect(approvalSnapshots).toEqual([false]);
    expect(contextSnapshots).toEqual([undefined]);

    setAgentProvider(agentProvider);
    flushSync();
    expect(agentSnapshots).toEqual([false, true]);
    expect(approvalSnapshots).toEqual([false]);
    expect(contextSnapshots).toEqual([undefined]);

    registerApproval('approval-1', () => undefined);
    flushSync();
    expect(approvalSnapshots).toEqual([false, true]);
    expect(contextSnapshots).toEqual([undefined]);

    setChatContext({ currentResource: 'orders' });
    flushSync();
    expect(contextSnapshots).toEqual([undefined, 'orders']);

    dispose();
  });
});
