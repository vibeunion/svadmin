import { Context } from '@svadmin/ai-elements/components/context';
import type { ContextUsage } from '@svadmin/ai-elements/components/context';

const usage: ContextUsage = { inputTokens: 1, outputTokens: 1 };
const contextFixture = {
  component: Context,
  props: { usedTokens: 2, maxTokens: 16, usage },
};

void contextFixture;
