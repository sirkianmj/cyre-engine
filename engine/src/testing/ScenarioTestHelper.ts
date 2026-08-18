/**
 * ScenarioTestHelper
 * -------------------
 * Provides quick scenario creation for tests, using the ScenarioEditor.
 */

import { ScenarioEditor } from '../scenario/index.js';
import { ScenarioDefinition } from '../scenario/index.js';

export class ScenarioTestHelper {
  /**
   * Build a minimal valid scenario with a simple linear network.
   * @param id Scenario id.
   * @returns A validated ScenarioDefinition.
   */
  static createMinimalScenario(id = 'test-scenario'): ScenarioDefinition {
    const editor = new ScenarioEditor()
      .setId(id)
      .setName(`Test Scenario ${id}`)
      .setOrganization('Test Org', 'Test Industry')
      .addNetworkNode('internet', 'internet')
      .addNetworkNode('firewall', 'firewall')
      .addNetworkNode('host1', 'client')
      .addNetworkNode('server1', 'server')
      .addNetworkEdge('internet', 'firewall')
      .addNetworkEdge('firewall', 'host1')
      .addNetworkEdge('host1', 'server1')
      .addAsset('asset1', 'Test Asset', 'server', 100)
      .addUser('user1', 'Test User', { email: 'test@example.com' })
      .setAttacker('attacker1', 'Test Attacker', 'Test Objective', 'low')
      .setDefense(['firewall'], 'basic')
      .setAttackPath('internet', 'server1', ['internet', 'firewall', 'host1', 'server1'])
      .addEvidence('e1', 'log', 'Test Evidence', 'Description')
      .addObjective('o1', 'Test Objective')
      .addTimelineEvent('t1', 'event', 100, { sourceId: 'firewall' })
      .setTimeLimit(600000)
      .setSeed(42);

    return editor.build();
  }
}
