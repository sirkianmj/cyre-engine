import { useMemo, useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function AttackGraphPanel(): JSX.Element {
  const {
    state,
    addAttackGraphNode,
    connectAttackGraphNodes,
    removeAttackGraphNode,
  } = useStudio();

  const [label, setLabel] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = state.attackGraphNodes;
  const edges = state.attackGraphEdges;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      map.set(node.id, { x: 100 + col * 160, y: 80 + row * 120 });
    });
    return map;
  }, [nodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <div className="graph-panel">
      <div className="graph-toolbar">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Attack node label"
        />
        <button
          onClick={() => {
            addAttackGraphNode(label, 'hidden');
            setLabel('');
          }}
        >
          Add Node
        </button>
        <button
          onClick={() => {
            const source = window.prompt('Source node id:');
            const target = window.prompt('Target node id:');
            if (source && target) {
              connectAttackGraphNodes(source, target);
            }
          }}
        >
          Connect
        </button>
        {selectedNodeId && (
          <button
            onClick={() => {
              removeAttackGraphNode(selectedNodeId);
              setSelectedNodeId(null);
            }}
          >
            Delete Selected
          </button>
        )}
      </div>

      <div className="graph-canvas">
        <svg width="100%" height="100%" viewBox="0 0 900 500">
          {edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="graph-edge"
              />
            );
          })}

          {nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            return (
              <g
                key={node.id}
                transform={`translate(${position.x} ${position.y})`}
                className={`graph-node status-${node.status} ${
                  selectedNodeId === node.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <circle r={28} />
                <text y={-10} textAnchor="middle">
                  {node.label}
                </text>
                <text y={8} textAnchor="middle" className="graph-node-meta">
                  {node.status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="graph-selection-bar">
          Selected: {selectedNode.label} ({selectedNode.status})
        </div>
      )}
    </div>
  );
}

export function EvidenceGraphPanel(): JSX.Element {
  const {
    state,
    addEvidenceGraphNode,
    connectEvidenceGraphNodes,
    removeEvidenceGraphNode,
  } = useStudio();

  const [label, setLabel] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = state.evidenceGraphNodes;
  const edges = state.evidenceGraphEdges;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      map.set(node.id, { x: 110 + col * 165, y: 90 + row * 130 });
    });
    return map;
  }, [nodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <div className="graph-panel">
      <div className="graph-toolbar">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Evidence node label"
        />
        <button
          onClick={() => {
            addEvidenceGraphNode(label, 'evidence');
            setLabel('');
          }}
        >
          Add Node
        </button>
        <button
          onClick={() => {
            const source = window.prompt('Source evidence node id:');
            const target = window.prompt('Target evidence node id:');
            if (source && target) {
              connectEvidenceGraphNodes(source, target, 'references');
            }
          }}
        >
          Connect
        </button>
        {selectedNodeId && (
          <button
            onClick={() => {
              removeEvidenceGraphNode(selectedNodeId);
              setSelectedNodeId(null);
            }}
          >
            Delete Selected
          </button>
        )}
      </div>

      <div className="graph-canvas">
        <svg width="100%" height="100%" viewBox="0 0 900 500">
          {edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="graph-edge evidence-edge"
              />
            );
          })}

          {nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            return (
              <g
                key={node.id}
                transform={`translate(${position.x} ${position.y})`}
                className={`evidence-node type-${node.type} ${
                  selectedNodeId === node.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <rect x={-30} y={-24} width={60} height={48} rx={8} />
                <text y={-8} textAnchor="middle">
                  {node.label}
                </text>
                <text y={10} textAnchor="middle" className="graph-node-meta">
                  {node.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="graph-selection-bar">
          Selected: {selectedNode.label} ({selectedNode.type})
        </div>
      )}
    </div>
  );
}

export function TimelinePanel(): JSX.Element {
  const {
    state,
    addTimelineEntry,
    removeTimelineEntry,
  } = useStudio();

  const [label, setLabel] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const entries = state.timelineEntries;
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);

  return (
    <div className="timeline-panel">
      <div className="graph-toolbar">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Timeline entry label"
        />
        <button
          onClick={() => {
            addTimelineEntry(Date.now(), label, 'event');
            setLabel('');
          }}
        >
          Add Entry
        </button>
        {selectedEntryId && (
          <button
            onClick={() => {
              removeTimelineEntry(selectedEntryId);
              setSelectedEntryId(null);
            }}
          >
            Delete Selected
          </button>
        )}
      </div>

      <div className="timeline-scroll">
        <div className="timeline-track">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`timeline-entry type-${entry.type} ${
                selectedEntryId === entry.id ? 'selected' : ''
              }`}
              onClick={() => setSelectedEntryId(entry.id)}
            >
              <span className="timeline-dot" />
              <span className="timeline-time">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="timeline-label">{entry.label}</span>
              <span className="timeline-type">{entry.type}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedEntry && (
        <div className="graph-selection-bar">
          Selected: {selectedEntry.label} ({selectedEntry.type})
        </div>
      )}
    </div>
  );
}
