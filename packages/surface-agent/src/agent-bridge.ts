import type { AgentProvider, ChatMessage } from '@svadmin/core';
import {
  SURFACE_AGENT_COMPONENT,
  type SurfaceAgentWorkflow,
  type SurfaceProposalWorkflowResult,
} from './types.js';

export async function requestSurfaceProposalFromAgent(request: {
  readonly provider: AgentProvider;
  readonly messages: ChatMessage[];
  readonly workflow: SurfaceAgentWorkflow;
  readonly signal?: AbortSignal;
}): Promise<SurfaceProposalWorkflowResult> {
  let proposal: unknown;
  try {
    for await (const event of request.provider.chat(request.messages, { signal: request.signal })) {
      if (event.type === 'tool_call' || event.type === 'approval_request' || event.type === 'tool_result') {
        return {
          ok: false,
          error: { code: 'agent_tool_event_denied', message: 'Agent tool events are not allowed in Surface proposals' },
        };
      }
      if (event.type !== 'component') continue;
      if (event.name !== SURFACE_AGENT_COMPONENT || proposal !== undefined) {
        return {
          ok: false,
          error: { code: 'agent_stream_invalid', message: 'Agent stream must contain exactly one Surface proposal' },
        };
      }
      proposal = event.props;
    }
  } catch {
    return { ok: false, error: { code: 'agent_stream_failed', message: 'Agent proposal stream failed' } };
  }
  return proposal === undefined
    ? { ok: false, error: { code: 'agent_stream_invalid', message: 'Agent stream did not contain a Surface proposal' } }
    : request.workflow.request(proposal);
}
