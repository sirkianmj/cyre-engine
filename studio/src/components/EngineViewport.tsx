import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '../studio/StudioContext';

type EngineRenderMode = '2d' | '2.5d' | '3d';

interface ProjectedNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  z: number;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  host: '#4f8cff',
  server: '#19c9a7',
  client: '#f39c12',
  router: '#2ecc71',
  firewall: '#e74c3c',
  database: '#f5a623',
  service: '#8a5cff',
  network: '#00bcd4',
  other: '#9b59b6',
};

function projectNode(
  node: any,
  mode: EngineRenderMode,
  index: number,
  time: number,
): ProjectedNode {
  const color = TYPE_COLORS[node.type] ?? TYPE_COLORS.other;
  const angle = (index / Math.max(1, 12)) * Math.PI * 2;
  const radius = 220 + (index % 3) * 40;
  const baseX = 400 + Math.cos(angle + time * 0.0004) * radius;
  const baseY = 300 + Math.sin(angle + time * 0.0004) * radius;

  return {
    id: node.id,
    label: node.label ?? node.id,
    type: node.type ?? 'other',
    x: node.position?.x ?? baseX,
    y: node.position?.y ?? baseY,
    z: mode === '2.5d' || mode === '3d' ? 80 + (index % 5) * 45 : 0,
    color,
  };
}

export function EngineViewport(): JSX.Element {
  const { state } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<EngineRenderMode>('3d');
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1, yaw: 0.6, pitch: -0.25 });

  const nodes = state.networkNodes;
  const edges = state.networkEdges;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; z: number }>();
    nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
      map.set(node.id, {
        x: node.position?.x ?? 400 + Math.cos(angle) * 240,
        y: node.position?.y ?? 300 + Math.sin(angle) * 180,
        z: 90 + (index % 4) * 50,
      });
    });
    return map;
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, rect.width * ratio);
      canvas.height = Math.max(1, rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const projectToScreen = (
      x: number,
      y: number,
      z: number,
    ): { x: number; y: number; scale: number } => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (mode === '2d') {
        return {
          x: x + camera.x + width / 2,
          y: y + camera.y + height / 2,
          scale: 1,
        };
      }

      if (mode === '2.5d') {
        const depth = Math.max(0.35, 1 - z / 520);
        return {
          x: (x - width / 2) * depth * camera.zoom + width / 2 + camera.x,
          y: (y - height / 2) * depth * camera.zoom + height / 2 + camera.y - z * 0.28,
          scale: depth,
        };
      }

      const cosY = Math.cos(camera.yaw);
      const sinY = Math.sin(camera.yaw);
      const cosP = Math.cos(camera.pitch);
      const sinP = Math.sin(camera.pitch);

      const worldX = x - 400;
      const worldY = y - 300;
      const worldZ = z - 180;

      const x1 = worldX * cosY + worldZ * sinY;
      const z1 = -worldX * sinY + worldZ * cosY;
      const y1 = worldY * cosP - z1 * sinP;
      const z2 = worldY * sinP + z1 * cosP;

      const focal = 700;
      const perspective = focal / Math.max(120, focal - z2);
      return {
        x: x1 * perspective * camera.zoom + width / 2 + camera.x,
        y: y1 * perspective * camera.zoom + height / 2 + camera.y,
        scale: perspective,
      };
    };

    const draw = (): void => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const gradient = context.createRadialGradient(
        width / 2,
        height / 2,
        60,
        width / 2,
        height / 2,
        Math.max(width, height),
      );
      gradient.addColorStop(0, '#0c1524');
      gradient.addColorStop(1, '#050810');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const gridSize = 70;
      context.strokeStyle = 'rgba(120, 170, 255, 0.09)';
      context.lineWidth = 1;
      for (let x = -width; x < width * 2; x += gridSize) {
        context.beginPath();
        context.moveTo(x + (camera.x % gridSize), 0);
        context.lineTo(x + (camera.x % gridSize), height);
        context.stroke();
      }
      for (let y = -height; y < height * 2; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y + (camera.y % gridSize));
        context.lineTo(width, y + (camera.y % gridSize));
        context.stroke();
      }

      const projected = new Map<string, ReturnType<typeof projectToScreen>>();
      for (const [id, pos] of positions.entries()) {
        projected.set(id, projectToScreen(pos.x, pos.y, pos.z));
      }

      context.lineWidth = 2;
      context.strokeStyle = 'rgba(80, 160, 255, 0.32)';
      for (const edge of edges) {
        const source = projected.get(edge.source);
        const target = projected.get(edge.target);
        if (!source || !target) continue;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      }

      const sorted = Array.from(positions.entries()).sort((a, b) => {
        const pa = projected.get(a[0]);
        const pb = projected.get(b[0]);
        return (pa?.y ?? 0) - (pb?.y ?? 0);
      });

      for (const [id, pos] of sorted) {
        const node = nodes.find((entry) => entry.id === id);
        if (!node) continue;
        const p = projected.get(id);
        if (!p) continue;
        const color = TYPE_COLORS[node.type] ?? TYPE_COLORS.other;
        const size = 32 * p.scale;

        context.save();
        context.translate(p.x, p.y);

        if (mode === '2d' || mode === '2.5d') {
          context.shadowColor = color;
          context.shadowBlur = 20;
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
          context.fillStyle = `${color}26`;
          context.fill();
          context.strokeStyle = color;
          context.lineWidth = 2;
          context.stroke();
        } else {
          context.shadowColor = color;
          context.shadowBlur = 26;
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
          context.fillStyle = `${color}26`;
          context.fill();
          context.strokeStyle = color;
          context.lineWidth = 2;
          context.stroke();
        }

        context.fillStyle = '#f5f7fb';
        context.font = `${Math.max(10, 12 * p.scale)}px Inter, sans-serif`;
        context.textAlign = 'center';
        context.fillText(node.label ?? id, 0, -(size + 9));
        context.fillStyle = '#8f9bb3';
        context.fillText(node.type ?? 'other', 0, -(size - 3));

        context.restore();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [mode, camera, nodes, edges, positions]);

  return (
    <div className="engine-viewport">
      <div className="viewport-mode-toolbar">
        {(['2d', '2.5d', '3d'] as EngineRenderMode[]).map((item) => (
          <button
            key={item}
            className={mode === item ? 'active' : ''}
            onClick={() => setMode(item)}
          >
            {item === '2d' ? '2D' : item === '2.5d' ? '2.5D' : '3D'}
          </button>
        ))}

        <span className="viewport-camera-controls">
          <button onClick={() => setCamera((c) => ({ ...c, zoom: c.zoom + 0.08 }))}>+</button>
          <button onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(0.25, c.zoom - 0.08) }))}>−</button>
          <button
            onClick={() =>
              setCamera((c) => ({
                ...c,
                yaw: c.yaw + 0.08,
                pitch: Math.max(-1.2, Math.min(1.2, c.pitch)),
              }))
            }
          >
            ⟳
          </button>
        </span>
      </div>

      <canvas ref={canvasRef} className="engine-viewport-canvas" />
    </div>
  );
}
