/**
 * CYRE Game Module Exports
 * --------------------------
 * Public API for missions, objectives, evidence, attack graph,
 * and investigation mechanics.
 */

export { createObjective, type Objective } from './Objective.js';
export { MissionStatus } from './MissionStatus.js';
export { Mission, type MissionOptions } from './Mission.js';
export { EvidenceType, ALL_EVIDENCE_TYPES, isEvidenceType } from './EvidenceType.js';
export { createEvidence, type Evidence } from './Evidence.js';
export { EvidenceCollection } from './EvidenceCollection.js';
export type {
  AttackGraphNode,
  AttackGraphEdge,
  AttackGraphNodeStatus,
  AttackGraphEdgeStatus,
} from './AttackGraphTypes.js';
export { AttackGraph, type PathResult } from './AttackGraph.js';
export { AlertStatus } from './AlertStatus.js';
export { Alert, type AlertSeverity, type AlertOptions } from './Alert.js';
export { InvestigationPhase } from './InvestigationPhase.js';
export { Hypothesis, type HypothesisStatus } from './Hypothesis.js';
export { InvestigationState, type DefensiveActionRecord } from './InvestigationState.js';
