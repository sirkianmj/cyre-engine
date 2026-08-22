import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function LiveInspectorPanel(): JSX.Element {
  const { state, captureLiveSimulation } = useStudio();
  const snapshot = state.liveSimulationSnapshot;

  return (
    <div className="live-panel">
      <div className="graph-toolbar">
        <button onClick={captureLiveSimulation}>Capture Snapshot</button>
      </div>

      {!snapshot ? (
        <div className="graph-empty">No live simulation snapshot.</div>
      ) : (
        <div className="live-snapshot">
          <div className="live-meta">
            <strong>{snapshot.missionName}</strong>
            <span>{snapshot.missionStatus}</span>
            <span>{snapshot.investigationPhase}</span>
          </div>

          <div className="live-grid">
            <div className="live-stat">
              <span>Evidence</span>
              <strong>{snapshot.evidenceCount}</strong>
            </div>
            <div className="live-stat">
              <span>Alerts</span>
              <strong>{snapshot.alertCount}</strong>
            </div>
            <div className="live-stat">
              <span>Hypotheses</span>
              <strong>{snapshot.hypothesisCount}</strong>
            </div>
            <div className="live-stat">
              <span>Score</span>
              <strong>{snapshot.score}</strong>
            </div>
          </div>

          <div className="graph-node-list">
            {snapshot.objectives.map((objective) => (
              <div key={objective.id} className="graph-node-row">
                <span>{objective.description}</span>
                <span className="graph-node-meta">
                  {objective.completed ? 'DONE' : 'OPEN'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveEventsPanel(): JSX.Element {
  const {
    state,
    recordLiveEvent,
    clearLiveEvents,
  } = useStudio();

  const [eventType, setEventType] = useState('alert_acknowledged');

  return (
    <div className="live-panel">
      <div className="graph-toolbar">
        <select
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
        >
          <option value="alert_acknowledged">Alert Acknowledged</option>
          <option value="evidence_viewed">Evidence Viewed</option>
          <option value="hypothesis_formed">Hypothesis Formed</option>
          <option value="containment_applied">Containment Applied</option>
          <option value="recovery_applied">Recovery Applied</option>
        </select>

        <button
          onClick={() => recordLiveEvent(eventType, 'studio-ui')}
        >
          Publish Event
        </button>

        <button onClick={clearLiveEvents}>Clear</button>
      </div>

      <div className="graph-node-list">
        {state.liveSimulationEvents.length === 0 ? (
          <div className="graph-empty">No live events.</div>
        ) : (
          state.liveSimulationEvents.slice(-40).reverse().map((event) => (
            <div key={event.id} className="graph-node-row">
              <span className="graph-node-meta">#{event.sequence}</span>
              <span>{event.type}</span>
              <span className="graph-node-meta">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
