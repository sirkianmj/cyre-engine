import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '../../cyber/simulation/index.js';
import {
  serializeCyberReplay,
  deserializeCyberReplay,
} from '../CyberReplayFileStore.js';

describe('cyber replay file store', () => {
  it('serializes and deserializes replay JSON', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();

    const replay = sim.createReplay();
    const json = serializeCyberReplay(replay);
    const parsed = deserializeCyberReplay(json);

    expect(parsed).toEqual(replay);

    const reproduced = CyberSimulation.replay(parsed);
    expect(reproduced.getState()).toEqual(sim.getState());
  });

  it('rejects invalid JSON', () => {
    expect(() => deserializeCyberReplay('not-json')).toThrowError(
      /invalid cyber replay json/i,
    );
  });

  it('rejects non-object replay input', () => {
    expect(() => serializeCyberReplay(null as any)).toThrowError(
      /must be an object/i,
    );
  });
});
