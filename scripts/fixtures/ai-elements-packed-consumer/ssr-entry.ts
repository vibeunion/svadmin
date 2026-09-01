import { render } from 'svelte/server';
import * as elements from '@svadmin/ai-elements';
import { Context } from '@svadmin/ai-elements/components/context';

export function runSsrSmoke() {
  return {
    exportCount: elements.AI_ELEMENT_PARITY.length,
    conversation: render(elements.Conversation).body,
    context: render(Context, {
      props: {
        usedTokens: 2,
        maxTokens: 16,
        usage: { inputTokens: 1, outputTokens: 1 },
      },
    }).body,
  };
}
