<script lang="ts">
  import Attachment from './Attachment.svelte';
  import AttachmentEmpty from './AttachmentEmpty.svelte';
  import AttachmentHoverCard from './AttachmentHoverCard.svelte';
  import AttachmentHoverCardContent from './AttachmentHoverCardContent.svelte';
  import AttachmentHoverCardTrigger from './AttachmentHoverCardTrigger.svelte';
  import AttachmentInfo from './AttachmentInfo.svelte';
  import AttachmentPreview from './AttachmentPreview.svelte';
  import AttachmentRemove from './AttachmentRemove.svelte';
  import Attachments from './Attachments.svelte';

  let removed = $state(false);
</script>

<output aria-label="Attachment state">{removed ? 'removed' : 'present'}</output>

<Attachments variant="list">
  <Attachment
    data={{ id: 'report', type: 'file', filename: 'report.pdf', mediaType: 'application/pdf', url: 'https://example.com/report.pdf' }}
    onRemove={() => { removed = true; }}
  >
    <AttachmentPreview />
    <AttachmentInfo showMediaType />
    <AttachmentRemove label="Delete report" />
  </Attachment>
  <AttachmentEmpty>Nothing else attached</AttachmentEmpty>
</Attachments>

<AttachmentHoverCard>
  <AttachmentHoverCardTrigger>Inspect attachment</AttachmentHoverCardTrigger>
  <AttachmentHoverCardContent>Attachment details</AttachmentHoverCardContent>
</AttachmentHoverCard>
