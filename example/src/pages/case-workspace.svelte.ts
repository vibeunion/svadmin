export type CaseStageId = 'overview' | 'execution' | 'evidence' | 'report';

export interface CaseWorkspaceState {
  readonly activeStage: CaseStageId;
  readonly inspectorOpen: boolean;
  readonly caseAccepted: boolean;
  readonly executionComplete: boolean;
  readonly rescued: boolean;
  readonly evidenceComplete: boolean;
  readonly savedAt: string | null;
  setStage(stage: CaseStageId): void;
  toggleInspector(open?: boolean): void;
  acceptCase(): void;
  completeExecution(): void;
  rescueBlocker(): void;
  completeEvidence(): void;
  markSaved(): void;
}

export function createCaseWorkspaceState(): CaseWorkspaceState {
  let activeStage = $state<CaseStageId>('overview');
  let inspectorOpen = $state(true);
  let caseAccepted = $state(false);
  let executionComplete = $state(false);
  let rescued = $state(false);
  let evidenceComplete = $state(false);
  let savedAt = $state<string | null>(null);

  return {
    get activeStage() { return activeStage; },
    get inspectorOpen() { return inspectorOpen; },
    get caseAccepted() { return caseAccepted; },
    get executionComplete() { return executionComplete; },
    get rescued() { return rescued; },
    get evidenceComplete() { return evidenceComplete; },
    get savedAt() { return savedAt; },
    setStage(stage) { activeStage = stage; },
    toggleInspector(open = !inspectorOpen) { inspectorOpen = open; },
    acceptCase() { caseAccepted = true; },
    completeExecution() { executionComplete = true; },
    rescueBlocker() { rescued = true; },
    completeEvidence() { evidenceComplete = true; },
    markSaved() { savedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); },
  };
}
