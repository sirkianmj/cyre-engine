/**
 * Mission005 - Cloud Misconfiguration and Data Exfiltration
 * ----------------------------------------------------------
 * A public cloud storage bucket is misconfigured, allowing an attacker
 * to access sensitive customer data and exfiltrate it.
 */

import { ScenarioEditor } from '../scenario/index.js';
import { ScenarioDefinition } from '../scenario/index.js';

export function createMission005Scenario(): ScenarioDefinition {
  const editor = new ScenarioEditor()
    .setId('mission-005')
    .setName('Cloud Data Leak')
    .setDescription(
      'A cloud storage bucket was left publicly accessible. An attacker ' +
      'discovered the bucket, accessed customer records, and exfiltrated them ' +
      'to an external host. Identify the misconfiguration, trace the path, ' +
      'and remediate the cloud environment.',
    )
    .setOrganization('NovaCloud Retail', 'Retail')
    .addNetworkNode('internet', 'internet')
    .addNetworkNode('cloud-console', 'server')
    .addNetworkNode('storage-bucket', 'server')
    .addNetworkNode('analytics-server', 'server')
    .addNetworkNode('external-host', 'server')
    .addNetworkEdge('internet', 'cloud-console')
    .addNetworkEdge('cloud-console', 'storage-bucket')
    .addNetworkEdge('storage-bucket', 'analytics-server')
    .addNetworkEdge('analytics-server', 'external-host')
    .addAsset('asset-customer', 'Customer Records', 'database', 100)
    .addAsset('asset-analytics', 'Analytics Data', 'server', 85)
    .addUser('user-cloudadmin', 'Evan Torres', { email: 'evan.torres@novacloud.example', role: 'cloud-admin' })
    .setAttacker('attacker-cloud', 'Cloud Intruder', 'Exfiltrate customer data', 'medium')
    .setDefense(['cloud-trail', 'iam', 'guard-duty'], 'advanced')
    .setAttackPath(
      'internet',
      'external-host',
      ['internet', 'cloud-console', 'storage-bucket', 'analytics-server', 'external-host'],
    )
    .addEvidence(
      'ev-401',
      'authentication_event',
      'Off-hours cloud console login',
      'Login to cloud-console at 01:20 from an unrecognized IP address.',
      { sourceId: 'cloud-console', timestamp: 120 },
    )
    .addEvidence(
      'ev-402',
      'network_record',
      'Public bucket enumeration',
      'Storage bucket enumerated from the same external IP at 01:25.',
      { sourceId: 'storage-bucket', timestamp: 125 },
    )
    .addEvidence(
      'ev-403',
      'forensic_artifact',
      'Credential harvesting script',
      'Script found on analytics-server that reads customer records.',
      { sourceId: 'analytics-server', timestamp: 132 },
    )
    .addEvidence(
      'ev-404',
      'network_record',
      'Large outbound data transfer',
      'Data transfer from analytics-server to external-host at 01:40.',
      { sourceId: 'analytics-server', timestamp: 140 },
    )
    .addObjective('obj-401', 'Identify the misconfigured cloud asset.')
    .addObjective('obj-402', 'Trace the cloud data exfiltration path.')
    .addObjective('obj-403', 'Remediate the cloud security misconfiguration.')
    .addTimelineEvent('tl-401', 'off_hours_login', 120, { sourceId: 'cloud-console' })
    .addTimelineEvent('tl-402', 'bucket_enumeration', 125, { sourceId: 'storage-bucket' })
    .addTimelineEvent('tl-403', 'data_access', 132, { sourceId: 'analytics-server' })
    .addTimelineEvent('tl-404', 'data_exfiltration', 140, { sourceId: 'analytics-server', targetId: 'external-host' })
    .setTimeLimit(600000)
    .setSeed(505);

  return editor.build();
}
