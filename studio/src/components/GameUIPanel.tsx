import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function GameUIPanel(): JSX.Element {
  const {
    state,
    setGameUIActivePanel,
    addGameUIEvidence,
    addGameUIAlert,
    addGameUITimelineEvent,
    setGameUIMission,
  } = useStudio();

  const [evidenceType, setEvidenceType] = useState('log');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('medium');
  const [timelineLabel, setTimelineLabel] = useState('');
  const [missionName, setMissionName] = useState('Default Mission');

  const game = state.gameUiRender as
    | {
        activePanel?: string;
        mission?: Record<string, unknown>;
        evidence?: Array<Record<string, unknown>>;
        alerts?: Array<Record<string, unknown>>;
        timeline?: Array<Record<string, unknown>>;
      }
    | null;

  const activePanel = game?.activePanel ?? 'mission';

  return (
    <div className="game-ui-panel">
      <div className="game-ui-tabs">
        {['mission', 'evidence', 'alerts', 'timeline'].map((panel) => (
          <button
            key={panel}
            className={activePanel === panel ? 'active' : ''}
            onClick={() => setGameUIActivePanel(panel)}
          >
            {panel.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="game-ui-content">
        {activePanel === 'mission' && (
          <div className="authoring-card">
            <input
              value={missionName}
              onChange={(event) => setMissionName(event.target.value)}
              placeholder="Mission name"
            />
            <button
              onClick={() =>
                setGameUIMission({
                  id: 'mission-ui',
                  name: missionName,
                  status: 'active',
                  objectives: [],
                })
              }
            >
              Set Mission
            </button>
            {game?.mission && (
              <pre className="authoring-preview">
                {JSON.stringify(game.mission, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activePanel === 'evidence' && (
          <div className="authoring-card">
            <input
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
              placeholder="Evidence title"
            />
            <input
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value)}
              placeholder="Evidence type"
            />
            <button
              onClick={() => {
                addGameUIEvidence({
                  id: `evidence-${Date.now()}`,
                  type: evidenceType,
                  title: evidenceTitle || 'New Evidence',
                  sourceId: 'studio',
                });
                setEvidenceTitle('');
              }}
            >
              Add Evidence
            </button>

            {(game?.evidence ?? []).map((item) => (
              <div key={String(item.id)} className="graph-node-row">
                <span>{String(item.title)}</span>
                <span className="graph-node-meta">
                  {String(item.type)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activePanel === 'alerts' && (
          <div className="authoring-card">
            <input
              value={alertTitle}
              onChange={(event) => setAlertTitle(event.target.value)}
              placeholder="Alert title"
            />
            <select
              value={alertSeverity}
              onChange={(event) => setAlertSeverity(event.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button
              onClick={() => {
                addGameUIAlert({
                  id: `alert-${Date.now()}`,
                  title: alertTitle || 'New Alert',
                  description: alertTitle || 'New Alert',
                  severity: alertSeverity,
                  status: 'new',
                  timestamp: Date.now(),
                });
                setAlertTitle('');
              }}
            >
              Add Alert
            </button>

            {(game?.alerts ?? []).map((item) => (
              <div key={String(item.id)} className="graph-node-row">
                <span>{String(item.title)}</span>
                <span className="graph-node-meta">
                  {String(item.severity)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activePanel === 'timeline' && (
          <div className="authoring-card">
            <input
              value={timelineLabel}
              onChange={(event) => setTimelineLabel(event.target.value)}
              placeholder="Timeline event label"
            />
            <button
              onClick={() => {
                addGameUITimelineEvent({
                  id: `event-${Date.now()}`,
                  timestamp: Date.now(),
                  label: timelineLabel || 'New Event',
                  type: 'event',
                });
                setTimelineLabel('');
              }}
            >
              Add Event
            </button>

            {(game?.timeline ?? []).map((item) => (
              <div key={String(item.id)} className="graph-node-row">
                <span>{String(item.label)}</span>
                <span className="graph-node-meta">
                  {String(item.type)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
