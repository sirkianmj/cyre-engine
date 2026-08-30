import type { CyberSimulationReplay } from '../cyber/simulation/index.js';

export function serializeCyberReplay(replay: CyberSimulationReplay): string {
  if (!replay || typeof replay !== 'object' || Array.isArray(replay)) {
    throw new Error('Cyber replay must be an object.');
  }

  return JSON.stringify(replay, null, 2);
}

export function deserializeCyberReplay(json: string): CyberSimulationReplay {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid cyber replay JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Cyber replay JSON must be an object.');
  }

  return parsed as CyberSimulationReplay;
}
