export type AIElementParityStatus = 'exact' | 'fallback' | 'missing';
export type AIElementParityExportKind = 'component' | 'helper';
export type AIElementParityVerificationStatus =
  | 'verified'
  | 'partial'
  | 'intentional-difference'
  | 'unverified';

export interface AIElementParityExport {
  upstream: string;
  kind: AIElementParityExportKind;
  surfaceStatus: AIElementParityStatus;
  localExport?: string;
}

export interface AIElementParityEntry {
  upstream: string;
  localDirectory: string;
  exportName: string;
  namespaceExport: string;
  officialExports: readonly string[];
  exports: readonly AIElementParityExport[];
  local: {
    surfaceStatus: AIElementParityStatus;
    componentSurfaceStatus: AIElementParityStatus;
    behaviorStatus: AIElementParityVerificationStatus;
    visualStatus: AIElementParityVerificationStatus;
    exactExports: readonly string[];
    fallbackExports: readonly string[];
    missingExports: readonly string[];
  };
}

export interface AIElementParityBreakdown {
  official: number;
  exact: number;
  fallback: number;
  missing: number;
}

export interface AIElementParitySummary {
  families: {
    total: number;
    surface: Omit<AIElementParityBreakdown, 'official'>;
    componentSurface: Omit<AIElementParityBreakdown, 'official'>;
    behavior: AIElementParityVerificationBreakdown;
    visual: AIElementParityVerificationBreakdown;
  };
  runtimeExports: AIElementParityBreakdown;
  componentExports: AIElementParityBreakdown;
  helperExports: AIElementParityBreakdown;
}

export interface AIElementParityVerificationBreakdown {
  verified: number;
  partial: number;
  intentionalDifference: number;
  unverified: number;
}

export const AI_ELEMENTS_UPSTREAM_SNAPSHOT = {
  repository: 'vercel/ai-elements',
  commit: '6a9d5b1822ffb10bba4bd97175f01edd7d8651cd',
  capturedAt: '2026-08-31',
  license: 'Apache-2.0',
} as const;

interface FamilyDefinition {
  official: string;
  exact?: string;
  helpers?: string;
  localDirectory?: string;
  namespaceExport?: string;
  behavior?: AIElementParityVerificationStatus;
  visual?: AIElementParityVerificationStatus;
}

const names = (value: string): string[] => value.split(' ').filter(Boolean);

function getStatus(exports: readonly AIElementParityExport[]): AIElementParityStatus {
  if (exports.every(({ surfaceStatus }) => surfaceStatus === 'exact')) return 'exact';
  if (exports.some(({ surfaceStatus }) => surfaceStatus !== 'missing')) return 'fallback';
  return 'missing';
}

function family(
  upstream: string,
  exportName: string,
  definition: FamilyDefinition,
): AIElementParityEntry {
  const officialExports = names(definition.official);
  const helperExports = new Set(names(definition.helpers ?? ''));
  const exactMappings = new Map(
    names(definition.exact ?? definition.official).map((name) => [name, name]),
  );

  const officialSet = new Set(officialExports);
  if (officialSet.size !== officialExports.length) {
    throw new Error(`Duplicate upstream exports in ${upstream}`);
  }

  for (const exportName of [...helperExports, ...exactMappings.keys()]) {
    if (!officialSet.has(exportName)) {
      throw new Error(`Unknown upstream export ${upstream}:${exportName}`);
    }
  }

  const exports = officialExports.map((upstreamExport): AIElementParityExport => {
    const kind: AIElementParityExportKind = helperExports.has(upstreamExport)
      ? 'helper'
      : 'component';
    const exactLocalExport = exactMappings.get(upstreamExport);
    if (exactLocalExport) {
      return {
        upstream: upstreamExport,
        kind,
        surfaceStatus: 'exact',
        localExport: exactLocalExport,
      };
    }

    return { upstream: upstreamExport, kind, surfaceStatus: 'missing' };
  });
  const componentExports = exports.filter(({ kind }) => kind === 'component');

  return {
    upstream,
    localDirectory: definition.localDirectory ?? upstream,
    exportName,
    namespaceExport: definition.namespaceExport ?? `${exportName}Parts`,
    officialExports,
    exports,
    local: {
      surfaceStatus: getStatus(exports),
      componentSurfaceStatus: getStatus(componentExports),
      behaviorStatus: definition.behavior ?? 'unverified',
      visualStatus: definition.visual ?? 'unverified',
      exactExports: exports
        .filter(({ surfaceStatus }) => surfaceStatus === 'exact')
        .map(({ upstream: upstreamExport }) => upstreamExport),
      fallbackExports: exports
        .filter(({ surfaceStatus }) => surfaceStatus === 'fallback')
        .map(({ upstream: upstreamExport }) => upstreamExport),
      missingExports: exports
        .filter(({ surfaceStatus }) => surfaceStatus === 'missing')
        .map(({ upstream: upstreamExport }) => upstreamExport),
    },
  };
}

// This manifest tracks the audited runtime export surface. Visual and behavioral
// fidelity is validated separately and must not be inferred from an exact export.
export const AI_ELEMENT_PARITY = [
  family('agent', 'Agent', {
    official: 'Agent AgentHeader AgentContent AgentInstructions AgentTools AgentTool AgentOutput',
    exact: 'Agent AgentHeader AgentContent AgentInstructions AgentTools AgentTool AgentOutput',
  }),
  family('artifact', 'Artifact', {
    official: 'Artifact ArtifactHeader ArtifactClose ArtifactTitle ArtifactDescription ArtifactActions ArtifactAction ArtifactContent',
    exact: 'Artifact ArtifactHeader ArtifactClose ArtifactTitle ArtifactDescription ArtifactActions ArtifactAction ArtifactContent',
  }),
  family('attachments', 'Attachments', {
    official: 'getMediaCategory getAttachmentLabel useAttachmentsContext useAttachmentContext Attachments Attachment AttachmentPreview AttachmentInfo AttachmentRemove AttachmentHoverCard AttachmentHoverCardTrigger AttachmentHoverCardContent AttachmentEmpty',
    exact: 'getMediaCategory getAttachmentLabel useAttachmentsContext useAttachmentContext Attachments Attachment AttachmentPreview AttachmentInfo AttachmentRemove AttachmentHoverCard AttachmentHoverCardTrigger AttachmentHoverCardContent AttachmentEmpty',
    helpers: 'getMediaCategory getAttachmentLabel useAttachmentsContext useAttachmentContext',
  }),
  family('audio-player', 'AudioPlayer', {
    official: 'AudioPlayer AudioPlayerElement AudioPlayerControlBar AudioPlayerPlayButton AudioPlayerSeekBackwardButton AudioPlayerSeekForwardButton AudioPlayerTimeDisplay AudioPlayerTimeRange AudioPlayerDurationDisplay AudioPlayerMuteButton AudioPlayerVolumeRange',
    exact: 'AudioPlayer AudioPlayerElement AudioPlayerControlBar AudioPlayerPlayButton AudioPlayerSeekBackwardButton AudioPlayerSeekForwardButton AudioPlayerTimeDisplay AudioPlayerTimeRange AudioPlayerDurationDisplay AudioPlayerMuteButton AudioPlayerVolumeRange',
  }),
  family('canvas', 'Canvas', {
    official: 'Canvas',
    exact: 'Canvas',
  }),
  family('chain-of-thought', 'ChainOfThought', {
    official: 'ChainOfThought ChainOfThoughtHeader ChainOfThoughtStep ChainOfThoughtSearchResults ChainOfThoughtSearchResult ChainOfThoughtContent ChainOfThoughtImage',
    exact: 'ChainOfThought ChainOfThoughtHeader ChainOfThoughtStep ChainOfThoughtSearchResults ChainOfThoughtSearchResult ChainOfThoughtContent ChainOfThoughtImage',
  }),
  family('checkpoint', 'Checkpoint', {
    official: 'Checkpoint CheckpointIcon CheckpointTrigger',
    exact: 'Checkpoint CheckpointIcon CheckpointTrigger',
  }),
  family('code-block', 'CodeBlock', {
    official: 'highlightCode CodeBlockContainer CodeBlockHeader CodeBlockTitle CodeBlockFilename CodeBlockActions CodeBlockContent CodeBlock CodeBlockCopyButton CodeBlockLanguageSelector CodeBlockLanguageSelectorTrigger CodeBlockLanguageSelectorValue CodeBlockLanguageSelectorContent CodeBlockLanguageSelectorItem',
    exact: 'highlightCode CodeBlockContainer CodeBlockHeader CodeBlockTitle CodeBlockFilename CodeBlockActions CodeBlockContent CodeBlock CodeBlockCopyButton CodeBlockLanguageSelector CodeBlockLanguageSelectorTrigger CodeBlockLanguageSelectorValue CodeBlockLanguageSelectorContent CodeBlockLanguageSelectorItem',
    helpers: 'highlightCode',
  }),
  family('commit', 'Commit', {
    official: 'Commit CommitHeader CommitHash CommitMessage CommitMetadata CommitSeparator CommitInfo CommitAuthor CommitAuthorAvatar CommitTimestamp CommitActions CommitCopyButton CommitContent CommitFiles CommitFile CommitFileInfo CommitFileStatus CommitFileIcon CommitFilePath CommitFileChanges CommitFileAdditions CommitFileDeletions',
    exact: 'Commit CommitHeader CommitHash CommitMessage CommitMetadata CommitSeparator CommitInfo CommitAuthor CommitAuthorAvatar CommitTimestamp CommitActions CommitCopyButton CommitContent CommitFiles CommitFile CommitFileInfo CommitFileStatus CommitFileIcon CommitFilePath CommitFileChanges CommitFileAdditions CommitFileDeletions',
  }),
  family('confirmation', 'Confirmation', {
    official: 'Confirmation ConfirmationTitle ConfirmationRequest ConfirmationAccepted ConfirmationRejected ConfirmationActions ConfirmationAction',
    exact: 'Confirmation ConfirmationTitle ConfirmationRequest ConfirmationAccepted ConfirmationRejected ConfirmationActions ConfirmationAction',
  }),
  family('connection', 'Connection', {
    official: 'Connection',
    exact: 'Connection',
  }),
  family('context', 'Context', {
    official: 'Context ContextTrigger ContextContent ContextContentHeader ContextContentBody ContextContentFooter ContextInputUsage ContextOutputUsage ContextReasoningUsage ContextCacheUsage',
    exact: 'Context ContextTrigger ContextContent ContextContentHeader ContextContentBody ContextContentFooter ContextInputUsage ContextOutputUsage ContextReasoningUsage ContextCacheUsage',
  }),
  family('controls', 'Controls', {
    official: 'Controls',
    exact: 'Controls',
  }),
  family('conversation', 'Conversation', {
    official: 'Conversation ConversationContent ConversationEmptyState ConversationScrollButton messagesToMarkdown ConversationDownload',
    exact: 'Conversation ConversationContent ConversationEmptyState ConversationScrollButton messagesToMarkdown ConversationDownload',
    helpers: 'messagesToMarkdown',
  }),
  family('edge', 'Edge', {
    official: 'Edge',
    exact: 'Edge',
  }),
  family('environment-variables', 'EnvironmentVariables', {
    official: 'EnvironmentVariables EnvironmentVariablesHeader EnvironmentVariablesTitle EnvironmentVariablesToggle EnvironmentVariablesContent EnvironmentVariableGroup EnvironmentVariableName EnvironmentVariableValue EnvironmentVariable EnvironmentVariableCopyButton EnvironmentVariableRequired',
    exact: 'EnvironmentVariables EnvironmentVariablesHeader EnvironmentVariablesTitle EnvironmentVariablesToggle EnvironmentVariablesContent EnvironmentVariableGroup EnvironmentVariableName EnvironmentVariableValue EnvironmentVariable EnvironmentVariableCopyButton EnvironmentVariableRequired',
  }),
  family('file-tree', 'FileTree', {
    official: 'FileTree FileTreeIcon FileTreeName FileTreeFolder FileTreeFile FileTreeActions',
    exact: 'FileTree FileTreeIcon FileTreeName FileTreeFolder FileTreeFile FileTreeActions',
  }),
  family('image', 'Image', {
    official: 'Image',
    exact: 'Image',
  }),
  family('inline-citation', 'InlineCitation', {
    official: 'InlineCitation InlineCitationText InlineCitationCard InlineCitationCardTrigger InlineCitationCardBody InlineCitationCarousel InlineCitationCarouselContent InlineCitationCarouselItem InlineCitationCarouselHeader InlineCitationCarouselIndex InlineCitationCarouselPrev InlineCitationCarouselNext InlineCitationSource InlineCitationQuote',
    exact: 'InlineCitation InlineCitationText InlineCitationCard InlineCitationCardTrigger InlineCitationCardBody InlineCitationCarousel InlineCitationCarouselContent InlineCitationCarouselItem InlineCitationCarouselHeader InlineCitationCarouselIndex InlineCitationCarouselPrev InlineCitationCarouselNext InlineCitationSource InlineCitationQuote',
  }),
  family('jsx-preview', 'JSXPreview', {
    official: 'useJSXPreview JSXPreview JSXPreviewContent JSXPreviewError',
    exact: 'useJSXPreview JSXPreview JSXPreviewContent JSXPreviewError',
    helpers: 'useJSXPreview',
    behavior: 'intentional-difference',
  }),
  family('message', 'Message', {
    official: 'Message MessageContent MessageActions MessageAction MessageBranch MessageBranchContent MessageBranchSelector MessageBranchPrevious MessageBranchNext MessageBranchPage MessageResponse MessageToolbar',
    exact: 'Message MessageContent MessageActions MessageAction MessageBranch MessageBranchContent MessageBranchSelector MessageBranchPrevious MessageBranchNext MessageBranchPage MessageResponse MessageToolbar',
  }),
  family('mic-selector', 'MicSelector', {
    official: 'useAudioDevices MicSelector MicSelectorTrigger MicSelectorContent MicSelectorInput MicSelectorList MicSelectorEmpty MicSelectorItem MicSelectorLabel MicSelectorValue',
    exact: 'useAudioDevices MicSelector MicSelectorTrigger MicSelectorContent MicSelectorInput MicSelectorList MicSelectorEmpty MicSelectorItem MicSelectorLabel MicSelectorValue',
    helpers: 'useAudioDevices',
  }),
  family('model-selector', 'ModelSelector', {
    official: 'ModelSelector ModelSelectorTrigger ModelSelectorContent ModelSelectorDialog ModelSelectorInput ModelSelectorList ModelSelectorEmpty ModelSelectorGroup ModelSelectorItem ModelSelectorShortcut ModelSelectorSeparator ModelSelectorLogo ModelSelectorLogoGroup ModelSelectorName',
    exact: 'ModelSelector ModelSelectorTrigger ModelSelectorContent ModelSelectorDialog ModelSelectorInput ModelSelectorList ModelSelectorEmpty ModelSelectorGroup ModelSelectorItem ModelSelectorShortcut ModelSelectorSeparator ModelSelectorLogo ModelSelectorLogoGroup ModelSelectorName',
  }),
  family('node', 'Node', {
    official: 'Node NodeHeader NodeTitle NodeDescription NodeAction NodeContent NodeFooter',
    exact: 'Node NodeHeader NodeTitle NodeDescription NodeAction NodeContent NodeFooter',
  }),
  family('open-in-chat', 'OpenIn', {
    official: 'OpenIn OpenInContent OpenInItem OpenInLabel OpenInSeparator OpenInTrigger OpenInChatGPT OpenInClaude OpenInT3 OpenInScira OpenInv0 OpenInCursor',
    exact: 'OpenIn OpenInContent OpenInItem OpenInLabel OpenInSeparator OpenInTrigger OpenInChatGPT OpenInClaude OpenInT3 OpenInScira OpenInv0 OpenInCursor',
  }),
  family('package-info', 'PackageInfo', {
    official: 'PackageInfoHeader PackageInfoName PackageInfoChangeType PackageInfoVersion PackageInfo PackageInfoDescription PackageInfoContent PackageInfoDependencies PackageInfoDependency',
    exact: 'PackageInfoHeader PackageInfoName PackageInfoChangeType PackageInfoVersion PackageInfo PackageInfoDescription PackageInfoContent PackageInfoDependencies PackageInfoDependency',
  }),
  family('panel', 'Panel', {
    official: 'Panel',
    exact: 'Panel',
  }),
  family('persona', 'Persona', {
    official: 'Persona',
    exact: 'Persona',
  }),
  family('plan', 'Plan', {
    official: 'Plan PlanHeader PlanTitle PlanDescription PlanAction PlanContent PlanFooter PlanTrigger',
    exact: 'Plan PlanHeader PlanTitle PlanDescription PlanAction PlanContent PlanFooter PlanTrigger',
  }),
  family('prompt-input', 'PromptInput', {
    official: 'usePromptInputController useProviderAttachments PromptInputProvider usePromptInputAttachments LocalReferencedSourcesContext usePromptInputReferencedSources PromptInputActionAddAttachments PromptInputActionAddScreenshot PromptInput PromptInputBody PromptInputTextarea PromptInputHeader PromptInputFooter PromptInputTools PromptInputButton PromptInputActionMenu PromptInputActionMenuTrigger PromptInputActionMenuContent PromptInputActionMenuItem PromptInputSubmit PromptInputSelect PromptInputSelectTrigger PromptInputSelectContent PromptInputSelectItem PromptInputSelectValue PromptInputHoverCard PromptInputHoverCardTrigger PromptInputHoverCardContent PromptInputTabsList PromptInputTab PromptInputTabLabel PromptInputTabBody PromptInputTabItem PromptInputCommand PromptInputCommandInput PromptInputCommandList PromptInputCommandEmpty PromptInputCommandGroup PromptInputCommandItem PromptInputCommandSeparator',
    exact: 'usePromptInputController useProviderAttachments PromptInputProvider usePromptInputAttachments LocalReferencedSourcesContext usePromptInputReferencedSources PromptInputActionAddAttachments PromptInputActionAddScreenshot PromptInput PromptInputBody PromptInputTextarea PromptInputHeader PromptInputFooter PromptInputTools PromptInputButton PromptInputActionMenu PromptInputActionMenuTrigger PromptInputActionMenuContent PromptInputActionMenuItem PromptInputSubmit PromptInputSelect PromptInputSelectTrigger PromptInputSelectContent PromptInputSelectItem PromptInputSelectValue PromptInputHoverCard PromptInputHoverCardTrigger PromptInputHoverCardContent PromptInputTabsList PromptInputTab PromptInputTabLabel PromptInputTabBody PromptInputTabItem PromptInputCommand PromptInputCommandInput PromptInputCommandList PromptInputCommandEmpty PromptInputCommandGroup PromptInputCommandItem PromptInputCommandSeparator',
    helpers: 'usePromptInputController useProviderAttachments usePromptInputAttachments usePromptInputReferencedSources',
  }),
  family('question', 'Question', {
    official: 'Question QuestionPrompt QuestionDescription QuestionOptions QuestionOption QuestionInput QuestionActions QuestionSubmit',
    exact: 'Question QuestionPrompt QuestionDescription QuestionOptions QuestionOption QuestionInput QuestionActions QuestionSubmit',
  }),
  family('queue', 'Queue', {
    official: 'QueueItem QueueItemIndicator QueueItemContent QueueItemDescription QueueItemActions QueueItemAction QueueItemAttachment QueueItemImage QueueItemFile QueueList QueueSection QueueSectionTrigger QueueSectionLabel QueueSectionContent Queue',
    exact: 'QueueItem QueueItemIndicator QueueItemContent QueueItemDescription QueueItemActions QueueItemAction QueueItemAttachment QueueItemImage QueueItemFile QueueList QueueSection QueueSectionTrigger QueueSectionLabel QueueSectionContent Queue',
  }),
  family('reasoning', 'Reasoning', {
    official: 'useReasoning Reasoning ReasoningTrigger ReasoningContent',
    exact: 'useReasoning Reasoning ReasoningTrigger ReasoningContent',
    helpers: 'useReasoning',
  }),
  family('sandbox', 'Sandbox', {
    official: 'Sandbox SandboxHeader SandboxContent SandboxTabs SandboxTabsBar SandboxTabsList SandboxTabsTrigger SandboxTabContent',
    exact: 'Sandbox SandboxHeader SandboxContent SandboxTabs SandboxTabsBar SandboxTabsList SandboxTabsTrigger SandboxTabContent',
  }),
  family('schema-display', 'SchemaDisplay', {
    official: 'SchemaDisplayHeader SchemaDisplayMethod SchemaDisplayPath SchemaDisplayDescription SchemaDisplayContent SchemaDisplayParameter SchemaDisplayParameters SchemaDisplayProperty SchemaDisplayRequest SchemaDisplayResponse SchemaDisplay SchemaDisplayBody SchemaDisplayExample',
    exact: 'SchemaDisplayHeader SchemaDisplayMethod SchemaDisplayPath SchemaDisplayDescription SchemaDisplayContent SchemaDisplayParameter SchemaDisplayParameters SchemaDisplayProperty SchemaDisplayRequest SchemaDisplayResponse SchemaDisplay SchemaDisplayBody SchemaDisplayExample',
  }),
  family('shimmer', 'Shimmer', {
    official: 'Shimmer',
    exact: 'Shimmer',
  }),
  family('snippet', 'Snippet', {
    official: 'Snippet SnippetAddon SnippetText SnippetInput SnippetCopyButton',
    exact: 'Snippet SnippetAddon SnippetText SnippetInput SnippetCopyButton',
  }),
  family('sources', 'Sources', {
    official: 'Sources SourcesTrigger SourcesContent Source',
    exact: 'Sources SourcesTrigger SourcesContent Source',
  }),
  family('speech-input', 'SpeechInput', {
    official: 'SpeechInput',
    exact: 'SpeechInput',
  }),
  family('stack-trace', 'StackTrace', {
    official: 'StackTrace StackTraceHeader StackTraceError StackTraceErrorType StackTraceErrorMessage StackTraceActions StackTraceCopyButton StackTraceExpandButton StackTraceContent StackTraceFrames',
    exact: 'StackTrace StackTraceHeader StackTraceError StackTraceErrorType StackTraceErrorMessage StackTraceActions StackTraceCopyButton StackTraceExpandButton StackTraceContent StackTraceFrames',
  }),
  family('suggestion', 'Suggestions', {
    official: 'Suggestions Suggestion',
    exact: 'Suggestions Suggestion',
    namespaceExport: 'SuggestionParts',
  }),
  family('task', 'Task', {
    official: 'TaskItemFile TaskItem Task TaskTrigger TaskContent',
    exact: 'TaskItemFile TaskItem Task TaskTrigger TaskContent',
  }),
  family('terminal', 'Terminal', {
    official: 'TerminalHeader TerminalTitle TerminalStatus TerminalActions TerminalCopyButton TerminalClearButton TerminalContent Terminal',
    exact: 'TerminalHeader TerminalTitle TerminalStatus TerminalActions TerminalCopyButton TerminalClearButton TerminalContent Terminal',
  }),
  family('test-results', 'TestResults', {
    official: 'TestResultsHeader TestResultsDuration TestResultsSummary TestResults TestResultsProgress TestResultsContent TestSuite TestSuiteName TestSuiteStats TestSuiteContent TestName TestDuration TestStatus Test TestError TestErrorMessage TestErrorStack',
    exact: 'TestResultsHeader TestResultsDuration TestResultsSummary TestResults TestResultsProgress TestResultsContent TestSuite TestSuiteName TestSuiteStats TestSuiteContent TestName TestDuration TestStatus Test TestError TestErrorMessage TestErrorStack',
  }),
  family('tool', 'Tool', {
    official: 'Tool getStatusBadge ToolHeader ToolContent ToolInput ToolOutput',
    exact: 'Tool getStatusBadge ToolHeader ToolContent ToolInput ToolOutput',
    helpers: 'getStatusBadge',
    behavior: 'intentional-difference',
  }),
  family('toolbar', 'Toolbar', {
    official: 'Toolbar',
    exact: 'Toolbar',
  }),
  family('transcription', 'Transcription', {
    official: 'Transcription TranscriptionSegment',
    exact: 'Transcription TranscriptionSegment',
  }),
  family('voice-selector', 'VoiceSelector', {
    official: 'useVoiceSelector VoiceSelector VoiceSelectorTrigger VoiceSelectorContent VoiceSelectorDialog VoiceSelectorInput VoiceSelectorList VoiceSelectorEmpty VoiceSelectorGroup VoiceSelectorItem VoiceSelectorShortcut VoiceSelectorSeparator VoiceSelectorGender VoiceSelectorAccent VoiceSelectorAge VoiceSelectorName VoiceSelectorDescription VoiceSelectorAttributes VoiceSelectorBullet VoiceSelectorPreview',
    exact: 'useVoiceSelector VoiceSelector VoiceSelectorTrigger VoiceSelectorContent VoiceSelectorDialog VoiceSelectorInput VoiceSelectorList VoiceSelectorEmpty VoiceSelectorGroup VoiceSelectorItem VoiceSelectorShortcut VoiceSelectorSeparator VoiceSelectorGender VoiceSelectorAccent VoiceSelectorAge VoiceSelectorName VoiceSelectorDescription VoiceSelectorAttributes VoiceSelectorBullet VoiceSelectorPreview',
    helpers: 'useVoiceSelector',
  }),
  family('web-preview', 'WebPreview', {
    official: 'WebPreview WebPreviewNavigation WebPreviewNavigationButton WebPreviewUrl WebPreviewBody WebPreviewConsole',
    exact: 'WebPreview WebPreviewNavigation WebPreviewNavigationButton WebPreviewUrl WebPreviewBody WebPreviewConsole',
  }),
] as const satisfies readonly AIElementParityEntry[];

function getBreakdown(exports: readonly AIElementParityExport[]): AIElementParityBreakdown {
  return {
    official: exports.length,
    exact: exports.filter(({ surfaceStatus }) => surfaceStatus === 'exact').length,
    fallback: exports.filter(({ surfaceStatus }) => surfaceStatus === 'fallback').length,
    missing: exports.filter(({ surfaceStatus }) => surfaceStatus === 'missing').length,
  };
}

function getSurfaceBreakdown(
  status: 'surfaceStatus' | 'componentSurfaceStatus',
): Omit<AIElementParityBreakdown, 'official'> {
  return {
    exact: AI_ELEMENT_PARITY.filter(({ local }) => local[status] === 'exact').length,
    fallback: AI_ELEMENT_PARITY.filter(({ local }) => local[status] === 'fallback').length,
    missing: AI_ELEMENT_PARITY.filter(({ local }) => local[status] === 'missing').length,
  };
}

function getVerificationBreakdown(
  status: 'behaviorStatus' | 'visualStatus',
): AIElementParityVerificationBreakdown {
  return {
    verified: AI_ELEMENT_PARITY.filter(({ local }) => local[status] === 'verified').length,
    partial: AI_ELEMENT_PARITY.filter(({ local }) => local[status] === 'partial').length,
    intentionalDifference: AI_ELEMENT_PARITY.filter(
      ({ local }) => local[status] === 'intentional-difference',
    ).length,
    unverified: AI_ELEMENT_PARITY.filter(({ local }) => local[status] === 'unverified').length,
  };
}

const runtimeExports = AI_ELEMENT_PARITY.flatMap((entry) => entry.exports);
const componentExports = runtimeExports.filter(({ kind }) => kind === 'component');
const helperExports = runtimeExports.filter(({ kind }) => kind === 'helper');

export const AI_ELEMENT_PARITY_SUMMARY: AIElementParitySummary = {
  families: {
    total: AI_ELEMENT_PARITY.length,
    surface: getSurfaceBreakdown('surfaceStatus'),
    componentSurface: getSurfaceBreakdown('componentSurfaceStatus'),
    behavior: getVerificationBreakdown('behaviorStatus'),
    visual: getVerificationBreakdown('visualStatus'),
  },
  runtimeExports: getBreakdown(runtimeExports),
  componentExports: getBreakdown(componentExports),
  helperExports: getBreakdown(helperExports),
};
