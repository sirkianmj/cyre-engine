import { describe, it, expect } from 'vitest';
import {
  AlertListUI,
  EvidencePanelUI,
  GameUIWorkspace,
  InvestigationTimelineUI,
  MissionStatusUI,
  UIComponentRegistry,
  UIRenderer,
  type GameUIAlertItem,
  type GameUIEvidenceItem,
  type GameUIMissionState,
  type GameUITimelineEvent,
} from '../index.js';

const evidence: GameUIEvidenceItem[] = [
  { id: 'ev-1', title: 'VPN login', type: 'authentication_event', timestamp: 100 },
  { id: 'ev-2', title: 'SMB connection', type: 'network_record', timestamp: 200 },
];

const alerts: GameUIAlertItem[] = [
  {
    id: 'alert-1',
    title: 'Failed VPN login',
    description: 'Multiple failures',
    severity: 'high',
    status: 'new',
    timestamp: 100,
    sourceId: 'vpn',
  },
  {
    id: 'alert-2',
    title: 'Lateral movement',
    description: 'SMB connection detected',
    severity: 'critical',
    status: 'new',
    timestamp: 200,
    sourceId: 'siem',
  },
];

const timeline: GameUITimelineEvent[] = [
  { id: 'tl-2', type: 'auth_success', timestamp: 200, sourceId: 'vpn' },
  { id: 'tl-1', type: 'alert', timestamp: 100, sourceId: 'vpn' },
];

const mission: GameUIMissionState = {
  id: 'mission-001',
  name: 'The Compromised Employee',
  status: 'active',
  objectives: [
    { id: 'obj-1', description: 'Identify host', completed: false },
    { id: 'obj-2', description: 'Trace path', completed: true },
  ],
  timeLimitMs: 600000,
};

describe('EvidencePanelUI', () => {
  it('stores and filters evidence', () => {
    const panel = new EvidencePanelUI(evidence);
    expect(panel.getFilteredItems()).toHaveLength(2);
    panel.setFilterType('network_record');
    expect(panel.getFilteredItems().map((item) => item.id)).toEqual(['ev-2']);
  });

  it('selects evidence and clears selection', () => {
    const panel = new EvidencePanelUI(evidence);
    panel.selectEvidence('ev-1');
    expect(panel.render().selectedId).toBe('ev-1');
    panel.clearSelection();
    expect(panel.render().selectedId).toBeUndefined();
  });

  it('rejects duplicate and missing evidence', () => {
    const panel = new EvidencePanelUI(evidence);
    expect(() =>
      panel.addEvidence({ id: 'ev-1', title: 'Dup', type: 'log' }),
    ).toThrow(/already exists/);
    expect(() => panel.selectEvidence('missing')).toThrow(/does not exist/);
  });
});

describe('AlertListUI', () => {
  it('filters and acknowledges alerts', () => {
    const list = new AlertListUI(alerts);
    list.acknowledgeAlert('alert-1');
    expect(list.render().items[0].status).toBe('acknowledged');
    list.setFilterStatus('acknowledged');
    expect(list.getFilteredItems()).toHaveLength(1);
  });

  it('rejects acknowledging non-new alert', () => {
    const list = new AlertListUI(alerts);
    list.acknowledgeAlert('alert-1');
    expect(() => list.acknowledgeAlert('alert-1')).toThrow(/status "acknowledged"/);
  });
});

describe('InvestigationTimelineUI', () => {
  it('sorts timeline events by timestamp', () => {
    const timelineUI = new InvestigationTimelineUI(timeline);
    expect(timelineUI.getSortedEvents().map((event) => event.id)).toEqual([
      'tl-1',
      'tl-2',
    ]);
  });

  it('selects an event', () => {
    const timelineUI = new InvestigationTimelineUI(timeline);
    timelineUI.selectEvent('tl-2');
    expect(timelineUI.render().selectedId).toBe('tl-2');
  });
});

describe('MissionStatusUI', () => {
  it('updates objective completion and status', () => {
    const ui = new MissionStatusUI(mission);
    ui.updateObjective('obj-1', true);
    expect(ui.getObjectives().find((o) => o.id === 'obj-1')?.completed).toBe(true);
    ui.setStatus('completed');
    expect(ui.render().mission.status).toBe('completed');
  });

  it('rejects missing objective', () => {
    const ui = new MissionStatusUI(mission);
    expect(() => ui.updateObjective('missing', true)).toThrow(/does not exist/);
  });
});

describe('GameUIWorkspace', () => {
  it('builds a complete game UI workspace', () => {
    const workspace = new GameUIWorkspace();
    workspace.setEvidence(evidence);
    workspace.setAlerts(alerts);
    workspace.setTimeline(timeline);
    workspace.setMission(mission);
    workspace.setActivePanel('alerts');
    workspace.selectAlert('alert-2');

    const rendered = workspace.render();
    expect(rendered.type).toBe('game-ui-workspace');
    expect(rendered.activePanel).toBe('alerts');
    expect(rendered.selectedAlertId).toBe('alert-2');
    expect(rendered.evidence).toHaveLength(2);
    expect(rendered.alerts).toHaveLength(2);
    expect(rendered.timeline).toHaveLength(2);
    expect(rendered.mission.id).toBe('mission-001');
  });

  it('rejects invalid selections and duplicate entries', () => {
    const workspace = new GameUIWorkspace();
    workspace.setEvidence(evidence);
    expect(() => workspace.selectEvidence('missing')).toThrow(/does not exist/);
    expect(() => workspace.addEvidence(evidence[0])).toThrow(/already exists/);
    expect(() => workspace.setActivePanel('invalid' as any)).toThrow(/panel/);
  });

  it('registers and renders through UIComponentRegistry', () => {
    const registry = new UIComponentRegistry(new UIRenderer());
    const workspace = new GameUIWorkspace();
    workspace.setMission(mission);
    registry.register('workspace', workspace);

    const rendered = registry.render('workspace');
    expect(rendered.componentType).toBe('game-ui-workspace');
    expect(rendered.data.mission.name).toBe('The Compromised Employee');
  });
});
