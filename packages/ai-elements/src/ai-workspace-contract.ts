/**
 * Ant Design X-inspired interaction capabilities for the SVAdmin AI workspace.
 *
 * This is a product-boundary contract, not a claim of React API compatibility.
 */
export type AIWorkspaceCapabilityStage = 'stable' | 'experimental' | 'planned';

export interface AIWorkspaceCapability {
  id:
    | 'welcome'
    | 'suggestion'
    | 'conversation'
    | 'sender'
    | 'streaming'
    | 'reasoning'
    | 'tool-calling'
    | 'approval'
    | 'task-progress'
    | 'command-bar'
    | 'persistence';
  stage: AIWorkspaceCapabilityStage;
  localSurfaces: readonly string[];
  acceptance: readonly string[];
}

export const AI_WORKSPACE_CAPABILITIES: readonly AIWorkspaceCapability[] = [
  { id: 'welcome', stage: 'stable', localSurfaces: ['ConversationEmptyState', 'ChatDialog'], acceptance: ['空态提供当前租户和资源范围内的下一步入口'] },
  { id: 'suggestion', stage: 'stable', localSurfaces: ['Suggestion', 'Suggestions', 'SmartSuggest'], acceptance: ['建议只能提交到当前对话或字段，不得直接执行写操作'] },
  { id: 'conversation', stage: 'stable', localSurfaces: ['Conversation', 'Message', 'Response'], acceptance: ['消息按当前用户、租户和资源作用域隔离'] },
  { id: 'sender', stage: 'stable', localSurfaces: ['PromptInput', 'PromptInputTextarea', 'PromptInputSubmit'], acceptance: ['发送、附件、停止和失败重试可被键盘和屏幕阅读器操作'] },
  { id: 'streaming', stage: 'stable', localSurfaces: ['ChatProvider', 'ChatDialog', 'Response'], acceptance: ['流式输出可中断，过期响应不得写回新会话'] },
  { id: 'reasoning', stage: 'stable', localSurfaces: ['Reasoning', 'ChainOfThought'], acceptance: ['推理过程可折叠，最终回答与中间过程视觉区分'] },
  { id: 'tool-calling', stage: 'stable', localSurfaces: ['AgentProvider', 'Tool', 'AdminTool'], acceptance: ['工具参数经 TypeBox 校验且服务端重新授权'] },
  { id: 'approval', stage: 'stable', localSurfaces: ['Confirmation', 'needsApproval', 'executeAdminTool'], acceptance: ['破坏性、权限、计费和批量写操作确认后才执行'] },
  { id: 'task-progress', stage: 'experimental', localSurfaces: ['Task', 'Plan', 'Queue', 'Checkpoint'], acceptance: ['长任务展示进度、失败原因和可恢复入口'] },
  { id: 'command-bar', stage: 'stable', localSurfaces: ['AICommandBar'], acceptance: ['导航搜索与自然语言查询可区分，失败时回退到普通命令搜索'] },
  { id: 'persistence', stage: 'stable', localSurfaces: ['ChatDialog', 'persistKey', 'onPersist', 'onRestore'], acceptance: ['历史恢复失败时禁止空历史覆盖远端记录'] },
] as const;

export const AI_WORKSPACE_STABLE_CAPABILITIES = AI_WORKSPACE_CAPABILITIES.filter(
  ({ stage }) => stage === 'stable',
);
