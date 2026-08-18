/**
 * Mission002 - Ransomware Spread via Phishing Attachment
 * -------------------------------------------------------
 * The player investigates a ransomware incident that began with
 * a phishing email containing a malicious attachment.
 */

import { ScenarioEditor } from '../scenario/index.js';
import { ScenarioDefinition } from '../scenario/index.js';

export function createMission002Scenario(): ScenarioDefinition {
  const editor = new ScenarioEditor()
    .setId('mission-002')
    .setName('Ransomware Outbreak')
    .setDescription(
      'A user opened a phishing attachment, leading to ransomware spreading ' +
      'across the internal network. Identify the entry point, trace lateral movement, ' +
      'and contain the outbreak.',
    )
    .setOrganization('Globex Manufacturing', 'Manufacturing')
    .addNetworkNode('internet', 'internet')
    .addNetworkNode('email-gateway', 'firewall')
    .addNetworkNode('user-pc', 'client')
    .addNetworkNode('file-server', 'server')
    .addNetworkNode('backup-server', 'server')
    .addNetworkEdge('internet', 'email-gateway')
    .addNetworkEdge('email-gateway', 'user-pc')
    .addNetworkEdge('user-pc', 'file-server')
    .addNetworkEdge('file-server', 'backup-server')
    .addAsset('asset-file', 'Engineering Files', 'file-server', 80)
    .addAsset('asset-backup', 'Backup System', 'backup-server', 90)
    .addUser('user-bob', 'Bob Smith', { email: 'bob.smith@globex.com', role: 'employee' })
    .setAttacker('attacker-fin12', 'FIN12', 'Encrypt files and demand ransom', 'high')
    .setDefense(['email-gateway', 'antivirus', 'backup'], 'basic')
    .setAttackPath(
      'internet',
      'backup-server',
      ['internet', 'email-gateway', 'user-pc', 'file-server', 'backup-server'],
    )
    .addEvidence(
      'ev-101',
      'email',
      'Phishing email received',
      'Email with subject "Invoice" from external sender containing malicious attachment.',
      { sourceId: 'email-gateway', timestamp: 400 },
    )
    .addEvidence(
      'ev-102',
      'forensic_artifact',
      'Malicious process on user PC',
      'Unknown executable running on user-pc at 04:12.',
      { sourceId: 'user-pc', timestamp: 420 },
    )
    .addEvidence(
      'ev-103',
      'network_record',
      'Lateral movement to file server',
      'SMB connection from user-pc to file-server at 04:25.',
      { sourceId: 'user-pc', timestamp: 425 },
    )
    .addEvidence(
      'ev-104',
      'network_record',
      'Connection to backup server',
      'RDP connection from file-server to backup-server at 04:31.',
      { sourceId: 'file-server', timestamp: 431 },
    )
    .addObjective('obj-101', 'Identify the phishing email as the entry point.')
    .addObjective('obj-102', 'Trace the ransomware spread.')
    .addObjective('obj-103', 'Contain the ransomware outbreak.')
    .addTimelineEvent('tl-101', 'email_received', 400, { sourceId: 'email-gateway', targetId: 'user-pc' })
    .addTimelineEvent('tl-102', 'malware_execution', 420, { sourceId: 'user-pc' })
    .addTimelineEvent('tl-103', 'lateral_movement', 425, { sourceId: 'user-pc', targetId: 'file-server' })
    .addTimelineEvent('tl-104', 'lateral_movement_2', 431, { sourceId: 'file-server', targetId: 'backup-server' })
    .setTimeLimit(600000)
    .setSeed(202);

  return editor.build();
}
