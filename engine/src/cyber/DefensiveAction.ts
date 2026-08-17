export enum DefensiveAction {
  Monitor = 'monitor',
  Detect = 'detect',
  Alert = 'alert',
  Investigate = 'investigate',
  Isolate = 'isolate',
  Block = 'block',
  RevokeCredentials = 'revoke_credentials',
  Patch = 'patch',
  Remediate = 'remediate',
  Recover = 'recover',
}

export const ALL_DEFENSIVE_ACTIONS: DefensiveAction[] = Object.values(DefensiveAction);

export function isDefensiveAction(value: string): value is DefensiveAction {
  return ALL_DEFENSIVE_ACTIONS.includes(value as DefensiveAction);
}
