export enum InvestigationPhase {
  Idle = 'idle',
  AlertReceived = 'alert_received',
  Investigating = 'investigating',
  HypothesisForming = 'hypothesis_forming',
  AttackPathIdentification = 'attack_path_identification',
  Containment = 'containment',
  Recovery = 'recovery',
  Complete = 'complete',
}
