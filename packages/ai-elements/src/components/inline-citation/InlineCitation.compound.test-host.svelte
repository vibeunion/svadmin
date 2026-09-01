<script lang="ts">
  import { InlineCitation, InlineCitationCard, InlineCitationCardBody, InlineCitationCardTrigger, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselHeader, InlineCitationCarouselIndex, InlineCitationCarouselItem, InlineCitationCarouselNext, InlineCitationCarouselPrev, InlineCitationQuote, InlineCitationSource, InlineCitationText } from './index.js';
</script>
<InlineCitation>
  <InlineCitationText>Supported statement</InlineCitationText>
  <InlineCitationCard>
    <InlineCitationCardTrigger sources={['https://example.com/a', 'https://docs.example.org/b']} />
    <InlineCitationCardBody>
      <InlineCitationCarousel>
        <InlineCitationCarouselHeader><InlineCitationCarouselPrev /><InlineCitationCarouselIndex /><InlineCitationCarouselNext /></InlineCitationCarouselHeader>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem><InlineCitationSource title="First" url="https://example.com/a" /><InlineCitationQuote>First quote</InlineCitationQuote></InlineCitationCarouselItem>
          <InlineCitationCarouselItem><InlineCitationSource title="Second" url="https://docs.example.org/b" /><InlineCitationQuote>Second quote</InlineCitationQuote></InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    </InlineCitationCardBody>
  </InlineCitationCard>
</InlineCitation>
