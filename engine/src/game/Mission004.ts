/**
 * Mission004 - Supply Chain Compromise
 * ------------------------------------
 * A malicious software update is pushed from a compromised update server
 * and reaches industrial control systems.
 */

import { ScenarioEditor } from '../scenario/index.js';
import { ScenarioDefinition } from '../scenario/index.js';

export function createMission004Scenario(): ScenarioDefinition {
  const editor = new ScenarioEditor()
    .setId('mission-004')
    .setName('Supply Chain Compromise')
    .setDescription(
      'A compromised software update was distributed to industrial systems. ' +
      'Trace the update from the internet to the control network, identify the ' +
      'affected systems, and contain the threat before it disrupts operations.',
    )
    .setOrganization('Meridian Energy', 'Energy')
    .addNetworkNode('internet', 'internet')
    .addNetworkNode('update-server', 'server')
    .addNetworkNode('ot-workstation', 'client')
    .addNetworkNode('control-server', 'server')
    .addNetworkNode('historian', 'server')
    .addNetworkEdge('internet', 'update-server')
    .addNetworkEdge('update-server', 'ot-workstation')
    .addNetworkEdge('ot-workstation', 'control-server')
    .addNetworkEdge('control-server', 'historian')
    .addAsset('asset-control', 'Industrial Control Server', 'server', 100)
    .addAsset('asset-historian', 'Operational Historian', 'server', 90)
    .addUser('user-operator', 'Dana Lee', { email: 'dana.lee@meridian-energy.example', role: 'operator' })
    .setAttacker('attacker-sc3', 'SC3', 'Disrupt industrial control operations', 'advanced')
    .setDefense(['update-server', 'siem', 'segmentation'], 'basic')
    .setAttackPath(
      'internet',
      'historian',
      ['internet', 'update-server', 'ot-workstation', 'control-server', 'historian'],
    )
    .addEvidence(
      'ev-301',
      'network_record',
      'Update server external connection',
      'Connection from external host to update-server at 04:05.',
      { sourceId: 'update-server', timestamp: 405 },
    )
    .addEvidence(
      'ev-302',
      'file',
      'Suspicious update package',
      'Signed update package contains an unexpected post-install script.',
      { sourceId: 'update-server', timestamp: 410 },
    )
    .addEvidence(
      'ev-303',
      'network_record',
      'Operator workstation update',
      'ot-workstation downloads the malicious update at 04:18.',
      { sourceId: 'ot-workstation', timestamp: 418 },
    )
    .addEvidence(
      'ev-304',
      'network_record',
      'Control server connection',
      'Unexpected connection from ot-workstation to control-server at 04:29.',
      { sourceId: 'ot-workstation', timestamp: 429 },
    )
    .addObjective('obj-301', 'Identify the compromised update server.')
    .addObjective('obj-302', 'Trace the supply chain attack path.')
    .addObjective('obj-303', 'Contain the industrial control system threat.')
    .addTimelineEvent('tl-301', 'external_connection', 405, { sourceId: 'update-server' })
    .addTimelineEvent('tl-302', 'malicious_update', 410, { sourceId: 'update-server', targetId: 'ot-workstation' })
    .addTimelineEvent('tl-303', 'update_installed', 418, { sourceId: 'ot-workstation' })
    .addTimelineEvent('tl-304', 'lateral_movement', 429, { sourceId: 'ot-workstation', targetId: 'control-server' })
    .setTimeLimit(600000)
    .setSeed(404);

  return editor.build();
}
