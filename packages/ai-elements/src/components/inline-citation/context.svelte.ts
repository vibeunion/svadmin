import { getContext, hasContext, setContext } from 'svelte';

export interface InlineCitationCardContextValue {
  readonly open: boolean;
  setOpen(open: boolean): void;
}

export interface InlineCitationCarouselContextValue {
  readonly current: number;
  readonly count: number;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  register(id: string): () => void;
  indexOf(id: string): number;
  previous(): void;
  next(): void;
  goTo(index: number): void;
}

const CARD_CONTEXT = Symbol('svadmin.ai-elements.inline-citation.card');
const CAROUSEL_CONTEXT = Symbol('svadmin.ai-elements.inline-citation.carousel');

export function provideInlineCitationCard(value: InlineCitationCardContextValue): void { setContext(CARD_CONTEXT, value); }
export function useInlineCitationCard(): InlineCitationCardContextValue {
  const value = hasContext(CARD_CONTEXT) ? getContext<InlineCitationCardContextValue>(CARD_CONTEXT) : undefined;
  if (!value) throw new Error('InlineCitationCard components must be used within InlineCitationCard');
  return value;
}

export function provideInlineCitationCarousel(value: InlineCitationCarouselContextValue): void { setContext(CAROUSEL_CONTEXT, value); }
export function useInlineCitationCarousel(): InlineCitationCarouselContextValue {
  const value = hasContext(CAROUSEL_CONTEXT) ? getContext<InlineCitationCarouselContextValue>(CAROUSEL_CONTEXT) : undefined;
  if (!value) throw new Error('InlineCitationCarousel components must be used within InlineCitationCarousel');
  return value;
}

export function sourceHostname(value: string | undefined): string {
  if (!value) return 'unknown';
  try { return new URL(value).hostname || 'unknown'; } catch { return 'unknown'; }
}
