/**
 * EvidenceType
 * -------------
 * Categories of evidence that can appear in a CYRE investigation.
 */

export enum EvidenceType {
  Log = 'log',
  Alert = 'alert',
  AuthenticationEvent = 'authentication_event',
  File = 'file',
  NetworkRecord = 'network_record',
  SystemInformation = 'system_information',
  ForensicArtifact = 'forensic_artifact',
  Email = 'email',
  SuspiciousConnection = 'suspicious_connection',
  BehavioralIndicator = 'behavioral_indicator',
}

export const ALL_EVIDENCE_TYPES: EvidenceType[] = Object.values(EvidenceType);

export function isEvidenceType(value: string): value is EvidenceType {
  return ALL_EVIDENCE_TYPES.includes(value as EvidenceType);
}
