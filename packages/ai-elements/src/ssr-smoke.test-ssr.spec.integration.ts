import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import InlineCitationSsrHost from './components/inline-citation/InlineCitation.ssr.test-host.svelte';
import * as publicApi from './index.js';

describe('@svadmin/ai-elements server rendering', () => {
  it('imports the complete root entry and renders representative surfaces', () => {
    const conversation = render(publicApi.Conversation);
    const response = render(publicApi.Response, { props: { text: 'Server rendered response' } });
    const confirmation = render(publicApi.Confirmation, { props: { title: 'Approve change' } });
    const inlineCitation = render(InlineCitationSsrHost);

    expect(publicApi.AI_ELEMENT_PARITY).toHaveLength(49);
    expect(conversation.body).toContain('aria-label="Conversation"');
    expect(response.body).toContain('Server rendered response');
    expect(confirmation.body).toContain('Approve change');
    expect(inlineCitation.body).toContain('First server quote');
    expect(inlineCitation.body).not.toContain('Second server quote');
    expect(inlineCitation.body).toContain('1/2');
  });
});
