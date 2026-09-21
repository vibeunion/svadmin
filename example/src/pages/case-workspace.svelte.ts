export type CaseStageId = 'overview' | 'execution' | 'evidence' | 'report';

export function isCaseStageId(value: string): value is CaseStageId {
  return ['overview', 'execution', 'evidence', 'report'].includes(value);
}

export interface CaseWorkspaceState {
  readonly activeStage: CaseStageId;
  readonly inspectorOpen: boolean;
  readonly caseAccepted: boolean;
  readonly executionComplete: boolean;
  readonly rescued: boolean;
  readonly evidenceComplete: boolean;
  readonly savedAt: string | null;
  readonly executionNote: string;
  readonly evidenceName: string;
  readonly magnification: string;
  recordExecution(note: string): void;
  recordEvidence(name: string, magnification: string): void;
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
  let executionNote = $state('');
  let evidenceName = $state('');
  let magnification = $state('');

  return {
    get activeStage() { return activeStage; },
    get inspectorOpen() { return inspectorOpen; },
    get caseAccepted() { return caseAccepted; },
    get executionComplete() { return executionComplete; },
    get rescued() { return rescued; },
    get evidenceComplete() { return evidenceComplete; },
    get savedAt() { return savedAt; },
    get executionNote() { return executionNote; },
    get evidenceName() { return evidenceName; },
    get magnification() { return magnification; },
    recordExecution(note) { executionNote = note.trim(); executionComplete = false; evidenceComplete = false; },
    recordEvidence(name, scale) { evidenceName = name; magnification = scale.trim(); evidenceComplete = false; },
    setStage(stage) {
      if (stage !== 'overview' && !caseAccepted) throw new Error('请先确认受理 / Accept the case first');
      if (['evidence', 'report'].includes(stage) && !executionComplete) throw new Error('请先提交试验记录 / Submit execution records first');
      if (stage === 'report' && !evidenceComplete) throw new Error('请先补齐证据 / Complete evidence first');
      activeStage = stage;
    },
    toggleInspector(open = !inspectorOpen) { inspectorOpen = open; },
    acceptCase() { caseAccepted = true; },
    completeExecution() {
      if (!caseAccepted || executionNote.length < 4) throw new Error('请填写试验记录，至少4个字符 / Enter an execution record, at least 4 characters');
      executionComplete = true;
    },
    rescueBlocker() { rescued = true; },
    completeEvidence() {
      if (!executionComplete || !evidenceName || !magnification) throw new Error('请提供证据和放大倍数 / Provide evidence and magnification');
      evidenceComplete = true;
    },
    markSaved() { savedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); },
  };
}
