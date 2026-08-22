import {
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  DragEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';

import type {
  NetworkGraphEdge,
  NetworkGraphNode,
} from '@cyre/engine';

interface ViewportProps {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  onSelectNode?: (nodeId: string) => void;
  onDropEntity?: (itemId: string, x: number, y: number) => void;
  onMoveNode?: (nodeId: string, x: number, y: number) => void;
  onConnectNodes?: (
    sourceId: string,
    targetId: string,
    edgeType?: string,
  ) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onSearchNodes?: (query: string) => NetworkGraphNode[];
  onValidateGraph?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const initialTransform: ViewTransform = { x: 0, y: 0, scale: 1 };

export function Viewport({
  nodes,
  edges,
  onSelectNode,
  onDropEntity,
  onMoveNode,
  onConnectNodes,
  onDeleteNode,
  onDeleteEdge,
  onSearchNodes,
  onValidateGraph,
}: ViewportProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<ViewTransform>(initialTransform);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    kind: 'node' | 'edge' | 'canvas';
    id?: string;
  } | null>(null);

  const nodePositions = useMemo(() => {
    const positions = new Map<string, Point>();

    nodes.forEach((node, index) => {
      positions.set(node.id, {
        x: node.position?.x ?? 100 + (index % 4) * 180,
        y: node.position?.y ?? 100 + Math.floor(index / 4) * 150,
      });
    });

    return positions;
  }, [nodes]);

  const screenToWorld = (
    clientX: number,
    clientY: number,
  ): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };

  const handleBackgroundPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (event.button === 0 || event.button === 1) {
      setPanning(true);
    }
  };

  const handleWindowPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (panning && containerRef.current) {
      setView((current) => ({
        ...current,
        x: current.x + event.movementX,
        y: current.y + event.movementY,
      }));
    }

    if (draggingNodeId) {
      const world = screenToWorld(event.clientX, event.clientY);
      onMoveNode?.(draggingNodeId, world.x, world.y);
    }
  };

  const handleWindowPointerUp = (): void => {
    setPanning(false);
    setDraggingNodeId(null);
    setConnectionSourceId(null);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = Math.min(3, Math.max(0.2, view.scale * zoomFactor));

    const worldBefore = {
      x: (mouseX - view.x) / view.scale,
      y: (mouseY - view.y) / view.scale,
    };

    const nextX = mouseX - worldBefore.x * nextScale;
    const nextY = mouseY - worldBefore.y * nextScale;

    setView({ x: nextX, y: nextY, scale: nextScale });
  };

  const resetView = (): void => setView(initialTransform);

  const fitView = (): void => {
    if (nodes.length === 0 || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const positions = Array.from(nodePositions.values());

    if (positions.length === 0) return;

    const minX = Math.min(...positions.map((point) => point.x)) - 80;
    const maxX = Math.max(...positions.map((point) => point.x)) + 80;
    const minY = Math.min(...positions.map((point) => point.y)) - 80;
    const maxY = Math.max(...positions.map((point) => point.y)) + 80;

    const graphWidth = Math.max(200, maxX - minX);
    const graphHeight = Math.max(200, maxY - minY);

    const scale = Math.min(
      rect.width / graphWidth,
      rect.height / graphHeight,
      1.5,
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setView({
      x: rect.width / 2 - centerX * scale,
      y: rect.height / 2 - centerY * scale,
      scale,
    });
  };

  const handleNodePointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    nodeId: string,
  ): void => {
    if (event.shiftKey) {
      setConnectionSourceId((current) =>
        current === nodeId ? null : nodeId,
      );
      return;
    }

    event.stopPropagation();
    setDraggingNodeId(nodeId);
    onSelectNode?.(nodeId);
  };

  const handleNodeContextMenu = (
    event: React.MouseEvent<SVGGElement>,
    nodeId: string,
  ): void => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      kind: 'node',
      id: nodeId,
    });
  };

  const handleNodeClick = (event: React.MouseEvent<SVGGElement>, nodeId: string): void => {
    if (connectionSourceId && connectionSourceId !== nodeId) {
      onConnectNodes?.(connectionSourceId, nodeId, 'default');
      setConnectionSourceId(null);
      return;
    }

    onSelectNode?.(nodeId);
  };

  const handleEdgeClick = (
    event: React.MouseEvent<SVGLineElement>,
    edgeId: string,
  ): void => {
    event.stopPropagation();
    setSelectedEdgeId(edgeId);
  };

  const handleEdgeContextMenu = (
    event: React.MouseEvent<SVGLineElement>,
    edgeId: string,
  ): void => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      kind: 'edge',
      id: edgeId,
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (onDropEntity) {
      event.preventDefault();
      const itemId = event.dataTransfer.getData(
        'application/x-cyre-entity',
      );
      if (!itemId) return;
      const world = screenToWorld(event.clientX, event.clientY);
      onDropEntity(itemId, world.x, world.y);
    }
  };

  const filteredNodes = search.trim() === ''
    ? nodes
    : (onSearchNodes?.(search) ?? nodes);

  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));

  const renderMinimap = (): JSX.Element => {
    const allPositions = Array.from(nodePositions.values());
    if (allPositions.length === 0) return <></>;

    const minX = Math.min(...allPositions.map((p) => p.x)) - 50;
    const maxX = Math.max(...allPositions.map((p) => p.x)) + 50;
    const minY = Math.min(...allPositions.map((p) => p.y)) - 50;
    const maxY = Math.max(...allPositions.map((p) => p.y)) + 50;

    const width = Math.max(100, maxX - minX);
    const height = Math.max(80, maxY - minY);
    const scale = 150 / Math.max(width, height);

    return (
      <div className="viewport-minimap">
        <svg viewBox={`0 0 ${width} ${height}`} width="150" height="100">
          <rect width="100%" height="100%" fill="rgba(0,0,0,.3)" />
          <g>
            {edges.map((edge) => {
              const source = nodePositions.get(edge.source);
              const target = nodePositions.get(edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={edge.id}
                  x1={(source.x - minX) * scale}
                  y1={(source.y - minY) * scale}
                  x2={(target.x - minX) * scale}
                  y2={(target.y - minY) * scale}
                  stroke="rgba(120,170,255,.45)"
                  strokeWidth="1"
                />
              );
            })}
            {nodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;
              return (
                <circle
                  key={node.id}
                  cx={(pos.x - minX) * scale}
                  cy={(pos.y - minY) * scale}
                  r="2.5"
                  fill="rgba(160,200,255,.9)"
                />
              );
            })}
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="cyre-viewport"
      onWheel={handleWheel}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleWindowPointerMove}
      onPointerUp={handleWindowPointerUp}
      onPointerLeave={handleWindowPointerUp}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          kind: 'canvas',
        });
      }}
    >
      <div className="viewport-toolbar">
        <button onClick={resetView} title="Reset View">⌂</button>
        <button onClick={fitView} title="Fit View">⤢</button>
        <button onClick={() => setView((v) => ({ ...v, scale: v.scale * 1.15 }))} title="Zoom In">+</button>
        <button onClick={() => setView((v) => ({ ...v, scale: Math.max(0.2, v.scale / 1.15) }))} title="Zoom Out">−</button>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search nodes…"
        />
        <button onClick={onValidateGraph} title="Validate Graph">✓ Validate</button>
      </div>

      {renderMinimap()}

      <svg
        className="network-svg"
        width="100%"
        height="100%"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <g className="network-edges">
            {edges.map((edge) => {
              const source = nodePositions.get(edge.source);
              const target = nodePositions.get(edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={`network-edge ${
                    selectedEdgeId === edge.id ? 'selected' : ''
                  }`}
                  onClick={(event) => handleEdgeClick(event, edge.id)}
                  onContextMenu={(event) =>
                    handleEdgeContextMenu(event, edge.id)
                  }
                />
              );
            })}
          </g>

          <g className="network-nodes">
            {nodes
              .filter((node) => filteredNodeIds.has(node.id))
              .map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                return (
                  <g
                    key={node.id}
                    className={`network-node ${
                      connectionSourceId === node.id ? 'connecting' : ''
                    }`}
                    transform={`translate(${pos.x} ${pos.y})`}
                    onPointerDown={(event) =>
                      handleNodePointerDown(event, node.id)
                    }
                    onClick={(event) => handleNodeClick(event, node.id)}
                    onContextMenu={(event) =>
                      handleNodeContextMenu(event, node.id)
                    }
                  >
                    <circle r="32" />
                    <text y="-10" textAnchor="middle">
                      {node.label}
                    </text>
                    <text y="8" textAnchor="middle" className="node-meta">
                      {node.type}
                    </text>
                  </g>
                );
              })}
          </g>
        </g>
      </svg>

      {nodes.length === 0 && (
        <div className="viewport-empty">
          <strong>No network nodes loaded</strong>
          <span>Drag entities from the palette or drop them here.</span>
        </div>
      )}

      {contextMenu && (
        <div
          className="viewport-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {contextMenu.kind === 'canvas' && (
            <>
              <button onClick={fitView}>Fit View</button>
              <button onClick={resetView}>Reset View</button>
            </>
          )}
          {contextMenu.kind === 'node' && contextMenu.id && (
            <>
              <button onClick={() => onSelectNode?.(contextMenu.id!)}>
                Inspect
              </button>
              <button onClick={() => onDeleteNode?.(contextMenu.id!)}>
                Delete Node
              </button>
            </>
          )}
          {contextMenu.kind === 'edge' && contextMenu.id && (
            <>
              <button onClick={() => onDeleteEdge?.(contextMenu.id!)}>
                Delete Edge
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
