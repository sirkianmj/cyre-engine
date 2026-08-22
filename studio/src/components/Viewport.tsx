import { useMemo } from 'react';

import type {
  NetworkGraphEdge,
  NetworkGraphNode,
} from '@cyre/engine';

interface ViewportProps {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  onSelectNode?: (nodeId: string) => void;
  onDropEntity?: (itemId: string, x: number, y: number) => void;
}

export function Viewport({
  nodes,
  edges,
  onSelectNode,
  onDropEntity,
}: ViewportProps): JSX.Element {
  const nodePositions = useMemo(() => {
    const positions = new Map<
      string,
      { x: number; y: number }
    >();

    nodes.forEach((node, index) => {
      positions.set(node.id, {
        x: node.position?.x ?? 100 + (index % 4) * 180,
        y: node.position?.y ?? 100 + Math.floor(index / 4) * 150,
      });
    });

    return positions;
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="cyre-viewport viewport-empty">
        <strong>No network nodes loaded</strong>
        <span>
          Open a scenario or use the Cyber Entity Palette.
        </span>
      </div>
    );
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    if (!onDropEntity) return;
    event.preventDefault();
    const itemId = event.dataTransfer.getData('application/x-cyre-entity');
    if (!itemId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onDropEntity(itemId, x, y);
  };

  return (
    <div
      className="cyre-viewport"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid meet"
      >
        {edges.map((edge) => {
          const source = nodePositions.get(edge.source);
          const target = nodePositions.get(edge.target);

          if (!source || !target) {
            return null;
          }

          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className="network-edge"
            />
          );
        })}

        {nodes.map((node) => {
          const position = nodePositions.get(node.id);

          if (!position) {
            return null;
          }

          return (
            <g
              key={node.id}
              className="network-node"
              onClick={() => onSelectNode?.(node.id)}
            >
              <circle
                cx={position.x}
                cy={position.y}
                r={38}
              />
              <text
                x={position.x}
                y={position.y - 14}
                textAnchor="middle"
              >
                {node.label}
              </text>
              <text
                x={position.x}
                y={position.y + 6}
                textAnchor="middle"
                className="node-meta"
              >
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
