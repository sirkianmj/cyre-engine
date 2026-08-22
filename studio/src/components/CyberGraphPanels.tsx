import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function AttackGraphPanel(): JSX.Element {
  const { state, addAttackGraphNode, connectAttackGraphNodes, removeAttackGraphNode } = useStudio();
  const [label, setLabel] = useState('');

  return (
    <div className="graph-panel">
      <div className="graph-toolbar">
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Node label" />
        <button onClick={() => { addAttackGraphNode(label, 'hidden'); setLabel(''); }}>Add Node</button>
        <button onClick={() => {
          const source = window.prompt('Source node id:');
          const target = window.prompt('Target node id:');
          if (source && target) connectAttackGraphNodes(source, target);
        }}>Connect</button>
      </div>
      <div className="graph-node-list">
        {state.attackGraphNodes.map((node) => (
          <div key={node.id} className="graph-node-row">
            <span>{node.label}</span>
            <span className="graph-node-meta">{node.status}</span>
            <button onClick={() => removeAttackGraphNode(node.id)}>×</button>
          </div>
        ))}
      </div>
      <div className="graph-edge-list">
        {state.attackGraphEdges.map((edge) => (
          <div key={edge.id} className="graph-edge-row">
            {edge.source} → {edge.target}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvidenceGraphPanel(): JSX.Element {
  const { state, addEvidenceGraphNode, connectEvidenceGraphNodes, removeEvidenceGraphNode } = useStudio();
  const [label, setLabel] = useState('');

  return (
    <div className="graph-panel">
      <div className="graph-toolbar">
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Evidence label" />
        <button onClick={() => { addEvidenceGraphNode(label, 'evidence'); setLabel(''); }}>Add</button>
        <button onClick={() => {
          const source = window.prompt('Source node id:');
          const target = window.prompt('Target node id:');
          if (source && target) connectEvidenceGraphNodes(source, target, 'references');
        }}>Connect</button>
      </div>
      <div className="graph-node-list">
        {state.evidenceGraphNodes.map((node) => (
          <div key={node.id} className="graph-node-row">
            <span>{node.label}</span>
            <span className="graph-node-meta">{node.type}</span>
            <button onClick={() => removeEvidenceGraphNode(node.id)}>×</button>
          </div>
        ))}
      </div>
      <div className="graph-edge-list">
        {state.evidenceGraphEdges.map((edge) => (
          <div key={edge.id} className="graph-edge-row">
            {edge.source} — {edge.type} → {edge.target}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelinePanel(): JSX.Element {
  const { state, addTimelineEntry, removeTimelineEntry } = useStudio();
  const [label, setLabel] = useState('');

  return (
    <div className="graph-panel">
      <div className="graph-toolbar">
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Entry label" />
        <button onClick={() => { addTimelineEntry(Date.now(), label, 'event'); setLabel(''); }}>Add Entry</button>
      </div>
      <div className="graph-node-list">
        {state.timelineEntries.map((entry) => (
          <div key={entry.id} className="graph-node-row">
            <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
            <span>{entry.label}</span>
            <span className="graph-node-meta">{entry.type}</span>
            <button onClick={() => removeTimelineEntry(entry.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
