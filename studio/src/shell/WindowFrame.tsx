/**
 * WindowFrame
 * ------------
 * Real window chrome: pointer-driven dragging, eight-edge resizing with the
 * opposite edge anchored, minimize / maximize / close, focus-on-pointer-down
 * and a focus ring on the active window.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { Icon } from '../ui/Icons';

import type { ResizeEdge, WindowInstance } from '../studio/WindowManager';

const RESIZE_EDGES: readonly ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

interface DragState {
  kind: 'move' | 'resize';
  edge?: ResizeEdge;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
}

export interface WindowFrameProps {
  window: WindowInstance;
  subtitle?: string;
  icon: ReactNode;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  children: ReactNode;
}

export function WindowFrame({
  window: frame,
  subtitle,
  icon,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  children,
}: WindowFrameProps): JSX.Element {
  const [drag, setDrag] = useState<DragState | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const beginDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, kind: 'move' | 'resize', edge?: ResizeEdge) => {
      if (event.button !== 0) return;
      event.preventDefault();
      onFocus(frame.id);

      setDrag({
        kind,
        edge,
        startX: event.clientX,
        startY: event.clientY,
        originX: frame.x,
        originY: frame.y,
        originWidth: frame.width,
        originHeight: frame.height,
      });
    },
    [frame.height, frame.id, frame.width, frame.x, frame.y, onFocus],
  );

  useEffect(() => {
    if (!drag) return;

    const onPointerMove = (event: PointerEvent): void => {
      const active = dragRef.current;
      if (!active) return;

      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;

      if (active.kind === 'move') {
        onMove(frame.id, active.originX + dx, active.originY + dy);
        return;
      }

      let width = active.originWidth;
      let height = active.originHeight;
      let x = active.originX;
      let y = active.originY;

      if (active.edge?.includes('e')) width = active.originWidth + dx;
      if (active.edge?.includes('s')) height = active.originHeight + dy;
      if (active.edge?.includes('w')) {
        width = active.originWidth - dx;
        x = active.originX + dx;
      }
      if (active.edge?.includes('n')) {
        height = active.originHeight - dy;
        y = active.originY + dy;
      }

      onResize(frame.id, width, height);
      if (active.edge?.includes('w') || active.edge?.includes('n')) {
        onMove(frame.id, x, y);
      }
    };

    const onPointerUp = (): void => setDrag(null);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [drag, frame.id, onMove, onResize]);

  return (
    <div
      className="cyre-window"
      ref={frameRef}
      role="dialog"
      aria-label={frame.title}
      data-window-id={frame.id}
      data-window-kind={frame.kind}
      data-focused={frame.focused}
      data-dragging={drag !== null || undefined}
      data-testid={`window-${frame.kind}`}
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: frame.z,
      }}
      onPointerDown={() => onFocus(frame.id)}
    >
      <header
        className="cyre-window-titlebar"
        onPointerDown={(event) => beginDrag(event, 'move')}
        onDoubleClick={() => onToggleMaximize(frame.id)}
      >
        <span className="cyre-window-title">
          {icon}
          <span className="cyre-window-title-text">{frame.title}</span>
          {subtitle ? <span className="cyre-window-subtitle">{subtitle}</span> : null}
        </span>

        <span className="cyre-window-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="cyre-window-control"
            title="Minimize"
            aria-label={`Minimize ${frame.title}`}
            data-testid={`window-minimize-${frame.kind}`}
            onClick={() => onMinimize(frame.id)}
          >
            <Icon name="minus" size={13} />
          </button>
          <button
            type="button"
            className="cyre-window-control"
            title={frame.maximized ? 'Restore' : 'Maximize'}
            aria-label={`${frame.maximized ? 'Restore' : 'Maximize'} ${frame.title}`}
            data-testid={`window-maximize-${frame.kind}`}
            onClick={() => onToggleMaximize(frame.id)}
          >
            <Icon name="maximize" size={12} />
          </button>
          <button
            type="button"
            className="cyre-window-control"
            data-tone="danger"
            title="Close"
            aria-label={`Close ${frame.title}`}
            data-testid={`window-close-${frame.kind}`}
            onClick={() => onClose(frame.id)}
          >
            <Icon name="x" size={13} />
          </button>
        </span>
      </header>

      <div className="cyre-window-body">{children}</div>

      {frame.maximized
        ? null
        : RESIZE_EDGES.map((edge) => (
            <span
              key={edge}
              className="cyre-window-resize"
              data-edge={edge}
              data-testid={`window-resize-${frame.kind}-${edge}`}
              onPointerDown={(event) => beginDrag(event, 'resize', edge)}
            />
          ))}
    </div>
  );
}
