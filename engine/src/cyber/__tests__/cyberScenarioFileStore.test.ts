import { describe, expect, it } from 'vitest';
import { findCyberScenario } from '../simulation/CyberScenarioCatalog.js';
import {
  serializeCyberScenarioDefinition,
  deserializeCyberScenarioDefinition,
} from '../simulation/CyberScenarioFileStore.js';
import { CyberScenarioSimulation } from '../simulation/CyberScenarioSimulation.js';

describe('cyber scenario file store', () => {
  it('serializes and deserializes a scenario definition', () => {
    const original = findCyberScenario('fintech');
    expect(original).toBeDefined();

    const json = serializeCyberScenarioDefinition(original!);
    const restored = deserializeCyberScenarioDefinition(json);

    expect(restored).toEqual(original);

    const sim = new CyberScenarioSimulation(restored);
    sim.initialize();
    expect(Object.keys(sim.getState().hosts)).toHaveLength(6);
    expect(sim.getState().objective.targetHostId).toBe('core-db');
  });

  it('rejects invalid scenario JSON', () => {
    expect(() => deserializeCyberScenarioDefinition('not-json')).toThrowError(
      /invalid cyber scenario json/i,
    );
  });

  it('rejects non-object scenario input', () => {
    expect(() => serializeCyberScenarioDefinition(null as any)).toThrowError(
      /must be an object/i,
    );
  });
});
