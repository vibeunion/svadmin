<script lang="ts">
  import type { SurfaceProposalReview as SurfaceProposalReviewRecord } from '../types.js';

  export interface SurfaceProposalReviewProps {
    readonly review: SurfaceProposalReviewRecord;
    readonly class?: string;
    readonly onApprove?: (review: SurfaceProposalReviewRecord) => void | Promise<void>;
    readonly onReject?: (review: SurfaceProposalReviewRecord) => void | Promise<void>;
  }

  let {
    review,
    class: className = '',
    onApprove,
    onReject,
  }: SurfaceProposalReviewProps = $props();

  let decisionBusy = $state(false);
  let decisionError = $state('');
  const beforeJson = $derived(JSON.stringify(review.before, null, 2));
  const afterJson = $derived(JSON.stringify(review.after, null, 2));

  async function decide(
    handler: SurfaceProposalReviewProps['onApprove'] | SurfaceProposalReviewProps['onReject'],
  ): Promise<void> {
    if (decisionBusy) return;
    decisionBusy = true;
    decisionError = '';
    try {
      await handler?.(review);
    } catch {
      decisionError = 'The proposal decision could not be completed.';
    } finally {
      decisionBusy = false;
    }
  }
</script>

<article class="proposal-review {className}" aria-busy={decisionBusy} data-surface-proposal={review.proposalId}>
  <header class="proposal-header">
    <div>
      <p class="proposal-eyebrow">Agent proposal</p>
      <h3>Surface change proposal</h3>
    </div>
    <span class="proposal-status" data-status={review.status}>{review.status}</span>
  </header>

  <p class="proposal-summary">{review.summary}</p>

  <dl class="proposal-metadata">
    <div>
      <dt>Base revision</dt>
      <dd>{review.baseRevision}</dd>
    </div>
    <div>
      <dt>Proposal digest</dt>
      <dd><code>{review.digest}</code></dd>
    </div>
    <div>
      <dt>Expires</dt>
      <dd><time datetime={review.expiresAt}>{review.expiresAt}</time></dd>
    </div>
  </dl>

  <section aria-labelledby="proposal-changes-{review.proposalId}">
    <h4 id="proposal-changes-{review.proposalId}">Changed paths</h4>
    <ul class="proposal-paths">
      {#each review.changedPaths as path (path)}
        <li><code>{path}</code></li>
      {/each}
    </ul>
  </section>

  <div class="proposal-diff">
    <section aria-labelledby="proposal-before-{review.proposalId}">
      <h4 id="proposal-before-{review.proposalId}">Before</h4>
      <pre role="region" aria-label="Before SurfaceSpec JSON">{beforeJson}</pre>
    </section>
    <section aria-labelledby="proposal-after-{review.proposalId}">
      <h4 id="proposal-after-{review.proposalId}">After</h4>
      <pre role="region" aria-label="After SurfaceSpec JSON">{afterJson}</pre>
    </section>
  </div>

  {#if decisionError}
    <p class="proposal-error" role="alert">{decisionError}</p>
  {/if}

  {#if review.status === 'pending'}
    <footer class="proposal-actions">
      <button type="button" class="proposal-reject" disabled={decisionBusy} onclick={() => decide(onReject)}>
        Reject proposal
      </button>
      <button type="button" class="proposal-approve" disabled={decisionBusy} onclick={() => decide(onApprove)}>
        Approve proposal
      </button>
    </footer>
  {/if}
</article>

<style>
  .proposal-review {
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: var(--card);
    color: var(--card-foreground);
  }

  .proposal-header,
  .proposal-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .proposal-header h3,
  .proposal-diff h4,
  .proposal-review h4 {
    margin: 0;
  }

  .proposal-eyebrow {
    margin: 0 0 0.2rem;
    color: var(--muted-foreground);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .proposal-status {
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .proposal-summary {
    margin: 1rem 0;
  }

  .proposal-metadata {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.75rem;
    margin: 0 0 1rem;
  }

  .proposal-metadata div {
    min-width: 0;
  }

  .proposal-metadata dt {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .proposal-metadata dd {
    margin: 0.2rem 0 0;
    overflow-wrap: anywhere;
  }

  .proposal-paths {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0 1rem;
    padding: 0;
    list-style: none;
  }

  .proposal-paths li {
    padding: 0.2rem 0.45rem;
    border-radius: 0.35rem;
    background: var(--muted);
  }

  .proposal-diff {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .proposal-diff pre {
    max-height: 18rem;
    margin: 0.5rem 0 0;
    padding: 0.75rem;
    overflow: auto;
    border-radius: 0.5rem;
    background: var(--muted);
    font-size: 0.75rem;
    line-height: 1.45;
    white-space: pre;
  }

  .proposal-actions {
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .proposal-actions button {
    min-height: 2.5rem;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .proposal-actions button:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .proposal-reject {
    background: var(--background);
    color: var(--foreground);
  }

  .proposal-approve {
    border-color: var(--primary) !important;
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .proposal-error {
    color: var(--destructive);
  }

  @media (max-width: 42rem) {
    .proposal-diff {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
