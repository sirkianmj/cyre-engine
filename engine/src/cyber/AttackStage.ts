/**
 * AttackStage
 * ------------
 * The stages of a cyber attack lifecycle.
 * Order is fixed and can be used to progress an attack.
 */

export enum AttackStage {
  Recon = 'recon',
  InitialAccess = 'initial_access',
  Execution = 'execution',
  Persistence = 'persistence',
  PrivilegeEscalation = 'privilege_escalation',
  CredentialAccess = 'credential_access',
  Discovery = 'discovery',
  LateralMovement = 'lateral_movement',
  Collection = 'collection',
  CommandAndControl = 'command_and_control',
  Exfiltration = 'exfiltration',
  Impact = 'impact',
}

export const ATTACK_STAGE_ORDER: AttackStage[] = [
  AttackStage.Recon,
  AttackStage.InitialAccess,
  AttackStage.Execution,
  AttackStage.Persistence,
  AttackStage.PrivilegeEscalation,
  AttackStage.CredentialAccess,
  AttackStage.Discovery,
  AttackStage.LateralMovement,
  AttackStage.Collection,
  AttackStage.CommandAndControl,
  AttackStage.Exfiltration,
  AttackStage.Impact,
];

export function getNextStage(stage: AttackStage): AttackStage | null {
  const index = ATTACK_STAGE_ORDER.indexOf(stage);
  if (index < 0 || index === ATTACK_STAGE_ORDER.length - 1) {
    return null;
  }
  return ATTACK_STAGE_ORDER[index + 1];
}

export function isStageReached(current: AttackStage, target: AttackStage): boolean {
  const currentIndex = ATTACK_STAGE_ORDER.indexOf(current);
  const targetIndex = ATTACK_STAGE_ORDER.indexOf(target);
  if (currentIndex < 0 || targetIndex < 0) {
    return false;
  }
  return currentIndex >= targetIndex;
}
