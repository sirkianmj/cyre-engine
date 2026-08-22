import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function DebuggerPanel(): JSX.Element {
  const {
    state,
    startDebugger,
    pauseDebugger,
    resumeDebugger,
    stopDebugger,
    refreshDebuggerSnapshot,
  } = useStudio();

  const debug = state.debugSnapshot;

  return (
    <div className="live-panel">
      <div className="graph-toolbar">
        <button onClick={startDebugger}>Start</button>
        <button onClick={pauseDebugger}>Pause</button>
        <button onClick={resumeDebugger}>Resume</button>
        <button onClick={stopDebugger}>Stop</button>
        <button onClick={refreshDebuggerSnapshot}>Refresh</button>
      </div>

      {!debug ? (
        <div className="graph-empty">No debugger snapshot.</div>
      ) : (
        <div className="live-snapshot">
          <div className="live-meta">
            <strong>{debug.state.toUpperCase()}</strong>
            <span>Breakpoints: {debug.breakpointCount}</span>
          </div>

          <div className="graph-node-list">
            {Object.entries(debug.entities).map(([id, value]) => (
              <div key={id} className="graph-node-row">
                <span>{id}</span>
                <span className="graph-node-meta">
                  {JSON.stringify(value).slice(0, 80)}
                </span>
              </div>
            ))}
          </div>

          <pre className="authoring-preview">{debug.summary}</pre>
        </div>
      )}
    </div>
  );
}

export function ReplayPanel(): JSX.Element {
  const {
    state,
    recordReplayEvent,
    stepReplay,
    playReplay,
    stopReplay,
    jumpReplay,
    addReplayBookmark,
    gotoReplayBookmark,
  } = useStudio();

  const [eventType, setEventType] = useState('mission-start');
  const [bookmark, setBookmark] = useState('');

  const events = state.replayEvents;
  const currentIndex = state.replayCurrentIndex;

  return (
    <div className="live-panel">
      <div className="graph-toolbar">
        <input
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          placeholder="Event type"
        />
        <button onClick={() => recordReplayEvent(eventType)}>Record</button>
        <button onClick={stepReplay}>Step</button>
        <button onClick={playReplay}>Play</button>
        <button onClick={stopReplay}>Stop</button>
        <button onClick={() => jumpReplay(0)}>Reset</button>
      </div>

      <div className="graph-toolbar">
        <input
          value={bookmark}
          onChange={(event) => setBookmark(event.target.value)}
          placeholder="Bookmark label"
        />
        <button onClick={() => { addReplayBookmark(bookmark); setBookmark(''); }}>
          Add Bookmark
        </button>
      </div>

      <div className="graph-node-list">
        {events.length === 0 ? (
          <div className="graph-empty">No replay events.</div>
        ) : (
          events.map((event, index) => (
            <button
              key={event.id}
              className={`graph-node-row ${
                currentIndex === index ? 'selected' : ''
              }`}
              onClick={() => jumpReplay(index)}
            >
              <span>{index}</span>
              <span>{event.type}</span>
              <span className="graph-node-meta">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="graph-node-list">
        {state.replayBookmarks.map((bookmarkItem) => (
          <button
            key={bookmarkItem.id}
            className="graph-node-row"
            onClick={() => gotoReplayBookmark(bookmarkItem.id)}
          >
            <span>{bookmarkItem.label}</span>
            <span className="graph-node-meta">#{bookmarkItem.index}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
