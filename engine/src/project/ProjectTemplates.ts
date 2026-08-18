export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  defaultSettings: Record<string, unknown>;
  defaultScenarioIds: string[];
  defaultMissionIds: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'soc-game',
    name: 'SOC Investigation Game',
    description: 'A game where the player acts as a SOC analyst investigating cyber incidents.',
    defaultSettings: {
      genre: 'soc',
      defaultDifficulty: 'medium',
      research: { enabled: false },
    },
    defaultScenarioIds: ['mission-001'],
    defaultMissionIds: ['mission-001'],
  },
  {
    id: 'investigation-game',
    name: 'Cyber Investigation Game',
    description: 'A story-driven cyber investigation game built around evidence and attack paths.',
    defaultSettings: {
      genre: 'investigation',
      defaultDifficulty: 'medium',
      research: { enabled: false },
    },
    defaultScenarioIds: ['mission-002'],
    defaultMissionIds: ['mission-002'],
  },
  {
    id: 'red-team-game',
    name: 'Red Team Operations Game',
    description: 'A game where the player plans and executes controlled offensive cyber operations.',
    defaultSettings: {
      genre: 'red-team',
      defaultDifficulty: 'hard',
      research: { enabled: false },
    },
    defaultScenarioIds: [],
    defaultMissionIds: [],
  },
  {
    id: 'training-simulation',
    name: 'Cyber Training Simulation',
    description: 'A serious-game training environment for cybersecurity education and exercises.',
    defaultSettings: {
      genre: 'training',
      defaultDifficulty: 'easy',
      research: { enabled: true },
    },
    defaultScenarioIds: [],
    defaultMissionIds: [],
  },
  {
    id: 'research-experiment',
    name: 'Research Experiment Project',
    description: 'A project configured for reproducible CYRE research experiments and telemetry.',
    defaultSettings: {
      genre: 'research',
      defaultDifficulty: 'medium',
      research: { enabled: true },
    },
    defaultScenarioIds: [],
    defaultMissionIds: [],
  },
];
