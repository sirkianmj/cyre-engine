/**
 * Mission003 - Insider Threat with Credential Abuse
 * --------------------------------------------------
 * The player investigates suspicious activity originating from an
 * internal employee account accessing HR and finance systems.
 */

import { ScenarioEditor } from '../scenario/ScenarioEditor.js';
import { Scenario as ScenarioDefinition } from '../scenario/Scenario.js';

export function createMission003Scenario(): ScenarioDefinition {
  const editor = new ScenarioEditor()
    .setId('mission-003')
    .setName('Insider Threat')
    .setDescription(
      'An employee account has been accessing sensitive HR and finance records ' +
      'outside of normal hours. Determine if this is an insider threat or credential theft.',
    )
    .setOrganization('Nimbus Financial', 'Finance')
    .addNetworkNode('internal-user-pc', 'client')
    .addNetworkNode('hr-database', 'server')
    .addNetworkNode('finance-server', 'server')
    .addNetworkNode('audit-server', 'server')
    .addNetworkEdge('internal-user-pc', 'hr-database')
    .addNetworkEdge('internal-user-pc', 'finance-server')
    .addNetworkEdge('hr-database', 'audit-server')
    .addNetworkEdge('finance-server', 'audit-server')
    .addAsset('asset-hr', 'Employee Records', 'hr-database', 90)
    .addAsset('asset-finance', 'Financial Data', 'finance-server', 100)
    .addAsset('asset-audit', 'Audit Logs', 'audit-server', 70)
    .addUser('user-carol', 'Carol Davis', { email: 'carol.davis@nimbus.com', role: 'analyst' })
    .setAttacker('insider-1', 'Unknown Insider', 'Exfiltrate employee and financial data', 'medium')
    .setDefense(['audit-logging', 'access-control'], 'advanced')
    .setAttackPath(
      'internal-user-pc',
      'finance-server',
      ['internal-user-pc', 'finance-server'],
    )
    .addEvidence(
      'ev-201',
      'authentication_event',
      'Off-hours login',
      'Login to finance-server at 02:13 from carol.davis account.',
      { sourceId: 'finance-server', timestamp: 213 },
    )
    .addEvidence(
      'ev-202',
      'authentication_event',
      'HR database access',
      'HR database accessed at 02:20 from carol.davis account.',
      { sourceId: 'hr-database', timestamp: 220 },
    )
    .addEvidence(
      'ev-203',
      'file',
      'Suspicious script on user PC',
      'PowerShell script found on internal-user-pc that queries HR and finance databases.',
      { sourceId: 'internal-user-pc', timestamp: 230 },
    )
    .addEvidence(
      'ev-204',
      'network_record',
      'Data transfer to external IP',
      'Large data transfer from finance-server to external IP 198.51.100.7 at 02:35.',
      { sourceId: 'finance-server', timestamp: 235 },
    )
    .addObjective('obj-201', 'Determine if the activity is an insider threat.')
    .addObjective('obj-202', 'Identify the data exfiltration path.')
    .addObjective('obj-203', 'Contain the incident and revoke compromised credentials.')
    .addTimelineEvent('tl-201', 'off_hours_login', 213, { sourceId: 'finance-server', targetId: 'internal-user-pc' })
    .addTimelineEvent('tl-202', 'hr_access', 220, { sourceId: 'internal-user-pc', targetId: 'hr-database' })
    .addTimelineEvent('tl-203', 'data_exfiltration', 235, { sourceId: 'finance-server' })
    .setTimeLimit(600000)
    .setSeed(303);

  return editor.build();
}
