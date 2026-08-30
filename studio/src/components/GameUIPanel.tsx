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
    play,
    pause,
    resume,
    stop,
    acknowledgeMissionAlert,
    formMissionHypothesis,
    identifyMissionAttackPath,
    containMissionIncident,
    recoverMissionIncident,
    completeMissionPlaythrough,
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
            <div className="authoring-card">
              <h4>Mission 001 Playthrough</h4>
              {state.missionRunSummary ? (
                <div className="graph-node-list">
                  <div className="graph-node-row">
                    <span>Status</span>
                    <span className="graph-node-meta">
                      {state.missionRunSummary.status}
                    </span>
                  </div>
                  <div className="graph-node-row">
                    <span>Score</span>
                    <span className="graph-node-meta">
                      {state.missionRunSummary.score}
                    </span>
                  </div>
                  <div className="graph-node-row">
                    <span>Hypothesis</span>
                    <span className="graph-node-meta">
                      {state.missionRunSummary.hypothesisFormed ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="graph-node-row">
                    <span>Attack Path</span>
                    <span className="graph-node-meta">
                      {state.missionRunSummary.attackPathIdentified ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="graph-node-row">
                    <span>Contained</span>
                    <span className="graph-node-meta">
                      {state.missionRunSummary.contained ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="graph-node-row">
                    <span>Recovered</span>
                    <span className="graph-node-meta">
                      {state.missionRunSummary.recovered ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="graph-empty">No mission runner loaded.</div>
              )}

              <div className="graph-toolbar">
                <button onClick={acknowledgeMissionAlert}>
                  Acknowledge Alert
                </button>
                <button onClick={() => formMissionHypothesis()}>
                  Form Hypothesis
                </button>
                <button onClick={() => identifyMissionAttackPath()}>
                  Identify Attack Path
                </button>
                <button onClick={containMissionIncident}>Contain</button>
                <button onClick={recoverMissionIncident}>Recover</button>
                <button onClick={completeMissionPlaythrough}>
                  Complete Mission
                </button>
              </div>
            </div>

            {state.campaignProgress && (
              <div className="authoring-card">
                <h4>Campaign</h4>
                <div className="graph-node-row">
                  <span>Current Mission</span>
                  <span className="graph-node-meta">
                    {state.campaignProgress.currentMissionId ?? 'None'}
                  </span>
                </div>
                <div className="graph-node-row">
                  <span>Completed</span>
                  <span className="graph-node-meta">
                    {state.campaignProgress.completedMissionIds.length}
                  </span>
                </div>
              </div>
            )}

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
