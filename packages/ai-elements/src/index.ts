export * from "./contracts.js";
export * from "./context.svelte.js";
export * from "./generated-components.js";
export * from "./parity-manifest.js";

// Migrated SVAdmin AI surfaces.
export { default as ChatDialog } from "./components/ChatDialog.svelte";
export type {
  ChatPersistenceErrorDetail,
  ChatPersistenceOperation,
} from "./components/ChatDialog.svelte";
export { default as CopilotPanel } from "./components/CopilotPanel.svelte";
export { default as AICommandBar } from "./components/AICommandBar.svelte";
export { default as InsightCard } from "./components/InsightCard.svelte";
export { default as SmartSuggest } from "./components/SmartSuggest.svelte";
export { default as VoiceInput } from "./components/VoiceInput.svelte";
export { default as Response } from "./components/Response.svelte";
export { default as AIButton } from "./components/Primitive.svelte";
export { Action, Actions } from './components/action/index.js';
export { Code, CodeOverflow, CodeCopyButton, codeVariants } from './components/code/index.js';

// Vercel AI Elements parity surface (49 component families).
export {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
} from "./components/agent/index.js";
export {
  Artifact,
  ArtifactHeader,
  ArtifactClose,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
} from "./components/artifact/index.js";
export {
  getMediaCategory,
  getAttachmentLabel,
  useAttachmentsContext,
  useAttachmentContext,
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  AttachmentHoverCardContent,
  AttachmentEmpty,
} from "./components/attachments/index.js";
export {
  AudioPlayer,
  AudioPlayerElement,
  AudioPlayerControlBar,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerDurationDisplay,
  AudioPlayerMuteButton,
  AudioPlayerVolumeRange,
} from "./components/audio-player/index.js";
export { Canvas } from "./components/canvas/index.js";
export {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtContent,
  ChainOfThoughtImage,
} from "./components/chain-of-thought/index.js";
export {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "./components/checkpoint/index.js";
export {
  highlightCode,
  CodeBlockContainer,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockOverflow,
  CodeBlockLanguageSelector,
  CodeBlockLanguageSelectorTrigger,
  CodeBlockLanguageSelectorValue,
  CodeBlockLanguageSelectorContent,
  CodeBlockLanguageSelectorItem,
} from "./components/code-block/index.js";
export {
  Commit,
  CommitHeader,
  CommitHash,
  CommitMessage,
  CommitMetadata,
  CommitSeparator,
  CommitInfo,
  CommitAuthor,
  CommitAuthorAvatar,
  CommitTimestamp,
  CommitActions,
  CommitCopyButton,
  CommitContent,
  CommitFiles,
  CommitFile,
  CommitFileInfo,
  CommitFileStatus,
  CommitFileIcon,
  CommitFilePath,
  CommitFileChanges,
  CommitFileAdditions,
  CommitFileDeletions,
} from "./components/commit/index.js";
export {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "./components/confirmation/index.js";
export { Connection } from "./components/connection/index.js";
export {
  Context,
  ContextIcon,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
  TokensWithCost,
} from "./components/context/index.js";
export { CopyButton } from "./components/copy-button/index.js";
export { Controls } from "./components/controls/index.js";
export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  messagesToMarkdown,
  ConversationDownload,
} from "./components/conversation/index.js";
export { Edge, Animated, Temporary } from "./components/edge/index.js";
export {
  EnvironmentVariables,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
  EnvironmentVariablesContent,
  EnvironmentVariableGroup,
  EnvironmentVariableName,
  EnvironmentVariableValue,
  EnvironmentVariable,
  EnvironmentVariableCopyButton,
  EnvironmentVariableRequired,
} from "./components/environment-variables/index.js";
export {
  FileTree,
  FileTreeIcon,
  FileTreeName,
  FileTreeFolder,
  FileTreeFile,
  FileTreeActions,
} from "./components/file-tree/index.js";
export { Image } from "./components/image/index.js";
export {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "./components/inline-citation/index.js";
export {
  completeJsxTags,
  defineJSXPreviewComponent,
  defineJSXPreviewSnippet,
  parseJSXPreview,
  useJSXPreview,
  validateJsx,
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
} from "./components/jsx-preview/index.js";
export {
  Message,
  MessageContent,
  MessageAvatar,
  MessageActions,
  MessageAction,
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
  MessageResponse,
  MessageToolbar,
  MessageAttachments,
  MessageAttachment,
  MessageAttachmentPreview,
} from "./components/message/index.js";
export {
  useAudioDevices,
  MicSelector,
  MicSelectorTrigger,
  MicSelectorContent,
  MicSelectorInput,
  MicSelectorList,
  MicSelectorEmpty,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorValue,
} from "./components/mic-selector/index.js";
export {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorDialog,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorShortcut,
  ModelSelectorSeparator,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
} from "./components/model-selector/index.js";
export {
  Node,
  NodeHeader,
  NodeTitle,
  NodeDescription,
  NodeAction,
  NodeContent,
  NodeFooter,
} from "./components/node/index.js";
export {
  OpenIn,
  OpenInContent,
  OpenInItem,
  OpenInLabel,
  OpenInSeparator,
  OpenInTrigger,
  OpenInChatGPT,
  OpenInClaude,
  OpenInT3,
  OpenInScira,
  OpenInv0,
  OpenInCursor,
} from "./components/open-in-chat/index.js";
export {
  PackageInfoHeader,
  PackageInfoName,
  PackageInfoChangeType,
  PackageInfoVersion,
  PackageInfo,
  PackageInfoDescription,
  PackageInfoContent,
  PackageInfoDependencies,
  PackageInfoDependency,
} from "./components/package-info/index.js";
export { Panel } from "./components/panel/index.js";
export { Persona } from "./components/persona/index.js";
export {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanAction,
  PlanContent,
  PlanFooter,
  PlanTrigger,
} from "./components/plan/index.js";
export {
  usePromptInputController,
  useProviderAttachments,
  PromptInputProvider,
  usePromptInputAttachments,
  LocalReferencedSourcesContext,
  usePromptInputReferencedSources,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTools,
  PromptInputToolbar,
  PromptInputAttachment,
  PromptInputAttachmentImagePreview,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputSubmit,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
  PromptInputHoverCard,
  PromptInputHoverCardTrigger,
  PromptInputHoverCardContent,
  PromptInputTabsList,
  PromptInputTab,
  PromptInputTabLabel,
  PromptInputTabBody,
  PromptInputTabItem,
  PromptInputCommand,
  PromptInputCommandInput,
  PromptInputCommandList,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandSeparator,
  PromptInputSpeechButton,
} from "./components/prompt-input/index.js";
export {
  Question,
  QuestionPrompt,
  QuestionDescription,
  QuestionOptions,
  QuestionOption,
  QuestionInput,
  QuestionActions,
  QuestionSubmit,
} from "./components/question/index.js";
export {
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
  QueueItemAttachment,
  QueueItemImage,
  QueueItemFile,
  QueueList,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  Queue,
} from "./components/queue/index.js";
export {
  useReasoning,
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "./components/reasoning/index.js";
export {
  Sandbox,
  SandboxHeader,
  SandboxContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxTabContent,
} from "./components/sandbox/index.js";
export {
  SchemaDisplayHeader,
  SchemaDisplayMethod,
  SchemaDisplayPath,
  SchemaDisplayDescription,
  SchemaDisplayContent,
  SchemaDisplayParameter,
  SchemaDisplayParameters,
  SchemaDisplayProperty,
  SchemaDisplayRequest,
  SchemaDisplayResponse,
  SchemaDisplay,
  SchemaDisplayBody,
  SchemaDisplayExample,
} from "./components/schema-display/index.js";
export { Shimmer } from "./components/shimmer/index.js";
export { Loader, LoaderIcon } from "./components/loader/index.js";
export {
  Snippet,
  SnippetAddon,
  SnippetText,
  SnippetInput,
  SnippetCopyButton,
} from "./components/snippet/index.js";
export {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "./components/sources/index.js";
export { SpeechInput } from "./components/speech-input/index.js";
export {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceActions,
  StackTraceCopyButton,
  StackTraceExpandButton,
  StackTraceContent,
  StackTraceFrames,
} from "./components/stack-trace/index.js";
export { Suggestions, Suggestion } from "./components/suggestion/index.js";
export {
  TaskItemFile,
  TaskItem,
  Task,
  TaskTrigger,
  TaskContent,
} from "./components/task/index.js";
export {
  TerminalHeader,
  TerminalTitle,
  TerminalStatus,
  TerminalActions,
  TerminalCopyButton,
  TerminalClearButton,
  TerminalContent,
  Terminal,
} from "./components/terminal/index.js";
export {
  TestResultsHeader,
  TestResultsDuration,
  TestResultsSummary,
  TestResults,
  TestResultsProgress,
  TestResultsContent,
  TestSuite,
  TestSuiteName,
  TestSuiteStats,
  TestSuiteContent,
  TestName,
  TestDuration,
  TestStatus,
  Test,
  TestError,
  TestErrorMessage,
  TestErrorStack,
} from "./components/test-results/index.js";
export {
  Tool,
  getStatusBadge,
  ToolStatusBadge,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "./components/tool/index.js";
export { Toolbar } from "./components/toolbar/index.js";
export {
  Transcription,
  TranscriptionSegment,
} from "./components/transcription/index.js";
export {
  useVoiceSelector,
  VoiceSelector,
  VoiceSelectorTrigger,
  VoiceSelectorContent,
  VoiceSelectorDialog,
  VoiceSelectorInput,
  VoiceSelectorList,
  VoiceSelectorEmpty,
  VoiceSelectorGroup,
  VoiceSelectorItem,
  VoiceSelectorShortcut,
  VoiceSelectorSeparator,
  VoiceSelectorGender,
  VoiceSelectorAccent,
  VoiceSelectorAge,
  VoiceSelectorName,
  VoiceSelectorDescription,
  VoiceSelectorAttributes,
  VoiceSelectorBullet,
  VoiceSelectorPreview,
} from "./components/voice-selector/index.js";
export {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from "./components/web-preview/index.js";
export {
  provideWebPreviewContext,
  useWebPreviewContext,
} from "./components/web-preview/context.svelte.js";
export type { AgentToolDefinition } from "./components/agent/index.js";
export type { ArtifactKind } from "./components/artifact/index.js";
export type { AudioPreload } from "./components/audio-player/index.js";
export type { ChainOfThoughtStepStatus } from "./components/chain-of-thought/index.js";
export type {
  CodeToken,
  TokenizedCode,
} from "./components/code-block/index.js";
export type { CommitFileState } from "./components/commit/index.js";
export type { ConfirmationStatus } from "./components/confirmation/index.js";
export type { CopyButtonProps, CopyStatus } from "./components/copy-button/index.js";
export type { ContextIconProps, TokensWithCostProps } from "./components/context/index.js";
export type { ConnectionLineProps } from "./components/connection/index.js";
export type {
  FileTreeNode,
  FileTreeNodeType,
  FileTreeRenderContext,
} from "./components/file-tree/index.js";
export type {
  GeneratedImageData,
  ImageProps,
} from "./components/image/index.js";
export type {
  JSXPreviewBindings,
  JSXPreviewComponentDefinition,
  JSXPreviewComponentProps,
  JSXPreviewComponents,
  JSXPreviewContextValue,
  JSXPreviewElementNode,
  JSXPreviewElementTarget,
  JSXPreviewNode,
  JSXPreviewParseResult,
  JSXPreviewParserOptions,
  JSXPreviewSchemaProps,
  JSXPreviewSnippetDefinition,
  JSXPreviewSvelteComponentDefinition,
  JSXPreviewTextNode,
} from "./components/jsx-preview/index.js";
export type {
  MicSelectorContextValue,
  MicSelectorProps,
} from "./components/mic-selector/index.js";
export type { ModelOption } from "./components/model-selector/index.js";
export type {
  NodeComponentProps,
  NodeHandles,
} from "./components/node/index.js";
export type {
  OpenInProvider,
  OpenInProviderDefinition,
} from "./components/open-in-chat/index.js";
export type {
  PackageChangeType,
  PackageInfoContextValue,
} from "./components/package-info/index.js";
export type {
  PersonaState,
  PersonaVariant,
} from "./components/persona/index.js";
export type { PlanStep, PlanStepStatus } from "./components/plan/index.js";
export type { PromptInputSpeechButtonProps, PromptInputSubmitDetail } from "./components/prompt-input/index.js";
export type {
  QuestionResponse,
  QuestionSelectionMode,
  QuestionValue,
} from "./components/question/index.js";
export type {
  QueueItem as QueueItemData,
  QueueItemStatus,
} from "./components/queue/index.js";
export type {
  SchemaDefinition,
  SchemaRow,
} from "./components/schema-display/index.js";
export type { TextShimmerProps } from "./components/shimmer/index.js";
export type { LoaderIconProps, LoaderProps } from "./components/loader/index.js";
export type {
  SnippetCopyButtonProps,
  SnippetProps,
} from "./components/snippet/index.js";
export type {
  SpeechRecognitionAlternativeLike,
  SpeechRecognitionConstructor,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
  SpeechRecognitionResultLike,
} from "./components/speech-input/index.js";
export type {
  StackTraceErrorData,
  StackTraceFrame,
} from "./components/stack-trace/index.js";
export type {
  SuggestionProps,
  SuggestionSize,
  SuggestionVariant,
} from "./components/suggestion/index.js";
export type { TaskStatus, TaskStep } from "./components/task/index.js";
export type {
  TerminalLine,
  TerminalLineKind,
} from "./components/terminal/index.js";
export type {
  TestResultItem,
  TestResultStatus,
} from "./components/test-results/index.js";
export type { ToolStatusBadgeProps } from "./components/tool/index.js";
export type { TranscriptSegment } from "./components/transcription/index.js";
export type { VoiceOption } from "./components/voice-selector/index.js";
export type { WebPreviewDevice } from "./components/web-preview/index.js";

export * as AgentParts from "./components/agent/index.js";
export * as ActionParts from './components/action/index.js';
export * as CodeParts from './components/code/index.js';
export * as ArtifactParts from "./components/artifact/index.js";
export * as AttachmentsParts from "./components/attachments/index.js";
export * as AudioPlayerParts from "./components/audio-player/index.js";
export * as CanvasParts from "./components/canvas/index.js";
export * as ChainOfThoughtParts from "./components/chain-of-thought/index.js";
export * as CheckpointParts from "./components/checkpoint/index.js";
export * as CodeBlockParts from "./components/code-block/index.js";
export * as CommitParts from "./components/commit/index.js";
export * as ConfirmationParts from "./components/confirmation/index.js";
export * as ConnectionParts from "./components/connection/index.js";
export * as ContextParts from "./components/context/index.js";
export * as CopyButtonParts from "./components/copy-button/index.js";
export * as ControlsParts from "./components/controls/index.js";
export * as ConversationParts from "./components/conversation/index.js";
export * as EdgeParts from "./components/edge/index.js";
export * as EnvironmentVariablesParts from "./components/environment-variables/index.js";
export * as FileTreeParts from "./components/file-tree/index.js";
export * as ImageParts from "./components/image/index.js";
export * as InlineCitationParts from "./components/inline-citation/index.js";
export * as JSXPreviewParts from "./components/jsx-preview/index.js";
export * as LoaderParts from "./components/loader/index.js";
export * as MessageParts from "./components/message/index.js";
export * as MicSelectorParts from "./components/mic-selector/index.js";
export * as ModelSelectorParts from "./components/model-selector/index.js";
export * as NodeParts from "./components/node/index.js";
export * as OpenInParts from "./components/open-in-chat/index.js";
export * as PackageInfoParts from "./components/package-info/index.js";
export * as PanelParts from "./components/panel/index.js";
export * as PersonaParts from "./components/persona/index.js";
export * as PlanParts from "./components/plan/index.js";
export * as PromptInputParts from "./components/prompt-input/index.js";
export * as QuestionParts from "./components/question/index.js";
export * as QueueParts from "./components/queue/index.js";
export * as ReasoningParts from "./components/reasoning/index.js";
export * as SandboxParts from "./components/sandbox/index.js";
export * as SchemaDisplayParts from "./components/schema-display/index.js";
export * as ShimmerParts from "./components/shimmer/index.js";
export * as SnippetParts from "./components/snippet/index.js";
export * as SourcesParts from "./components/sources/index.js";
export * as SpeechInputParts from "./components/speech-input/index.js";
export * as StackTraceParts from "./components/stack-trace/index.js";
export * as SuggestionParts from "./components/suggestion/index.js";
export * as TaskParts from "./components/task/index.js";
export * as TerminalParts from "./components/terminal/index.js";
export * as TestResultsParts from "./components/test-results/index.js";
export * as ToolParts from "./components/tool/index.js";
export * as ToolbarParts from "./components/toolbar/index.js";
export * as TranscriptionParts from "./components/transcription/index.js";
export * as VoiceSelectorParts from "./components/voice-selector/index.js";
export * as WebPreviewParts from "./components/web-preview/index.js";
