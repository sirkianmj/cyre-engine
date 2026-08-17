/**
 * Mission001 - The Compromised Employee
 * -------------------------------------
 * Defines the scenario for the first CYRE mission.
 * The player investigates suspicious authentication activity.
 */

import { ScenarioEditor } from '../scenario/ScenarioEditor.js';
import { Scenario as ScenarioDefinition } from '../scenario/Scenario.js';

export function createMission001Scenario(): ScenarioDefinition {
  const editor = new ScenarioEditor()
    .setId('mission-001')
    .setName('The Compromised Employee')
    .setDescription(
      'At 03:17, multiple anomalous authentication events were detected. ' +
      'Determine what is happening, identify the attack path, collect evidence, ' +
      'contain the incident, and prevent the attacker from reaching the database.',
    )
    .setOrganization('Acme Healthcare', 'Healthcare')
    .addNetworkNode('internet', 'internet')
    .addNetworkNode('vpn-gateway', 'firewall')
    .addNetworkNode('employee-pc', 'client')
    .addNetworkNode('file-server', 'server')
    .addNetworkNode('database', 'server')
    .addNetworkEdge('internet', 'vpn-gateway')
    .addNetworkEdge('vpn-gateway', 'employee-pc')
    .addNetworkEdge('employee-pc', 'file-server')
    .addNetworkEdge('file-server', 'database')
    .addAsset('asset-db', 'Patient Database', 'database', 100)
    .addUser('user-alice', 'Alice Johnson', { email: 'alice.johnson@acme-health.com', role: 'employee' })
    .setAttacker('attacker-apt29', 'APT29', 'Exfiltrate patient records', 'advanced')
    .setDefense(['vpn-gateway', 'antivirus', 'siem'], 'basic')
    .setAttackPath(
      'internet',
      'database',
      ['internet', 'vpn-gateway', 'employee-pc', 'file-server', 'database'],
    )
    .addEvidence(
      'ev-001',
      'authentication_event',
      'Failed VPN login attempts',
      'Multiple failed login attempts from 203.0.113.45 to VPN gateway between 03:10 and 03:15.',
      { sourceId: 'vpn-gateway', timestamp: 190 },
    )
    .addEvidence(
      'ev-002',
      'authentication_event',
      'Successful VPN login',
      'Successful VPN login for user alice.johnson at 03:17 from 203.0.113.45.',
      { sourceId: 'vpn-gateway', timestamp: 217 },
    )
    .addEvidence(
      'ev-003',
      'network_record',
      'Lateral movement to file-server',
      'Connection from employee-pc to file-server at 03:22 using SMB.',
      { sourceId: 'employee-pc', timestamp: 222 },
    )
    .addEvidence(
      'ev-004',
      'network_record',
      'Database query from file-server',
      'Database query from file-server to database at 03:25 reading patient table.',
      { sourceId: 'file-server', timestamp: 225 },
    )
    .addObjective('obj-001', 'Identify the compromised host.')
    .addObjective('obj-002', 'Trace the attack path from internet to database.')
    .addObjective('obj-003', 'Contain the incident and prevent data exfiltration.')
    .addTimelineEvent('tl-001', 'alert', 190, { sourceId: 'vpn-gateway' })
    .addTimelineEvent('tl-002', 'authentication_success', 217, { sourceId: 'vpn-gateway', targetId: 'employee-pc' })
    .addTimelineEvent('tl-003', 'lateral_movement', 222, { sourceId: 'employee-pc', targetId: 'file-server' })
    .addTimelineEvent('tl-004', 'data_access', 225, { sourceId: 'file-server', targetId: 'database' })
    .setTimeLimit(600000)
    .setSeed(101);

  return editor.build();
}
