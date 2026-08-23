import { useCallback, useRef } from 'react';

import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

interface SplitPaneProps {
  orientation: 'horizontal' | 'vertical';
  first: ReactNode;
  second: ReactNode;
  value: number;
  min?: number;
  max?: number;
  primary?: 'first' | 'second';
  onChange: (value: number) => void;
  className?: string;
}

export function SplitPane({
  orientation,
  first,
  second,
  value,
  min = 180,
  max = 640,
  primary = 'first',
  onChange,
  className,
}: SplitPaneProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const start = orientation === 'horizontal' ? event.clientX : event.clientY;
      const startValue = value;
      const pointerId = event.pointerId;
      event.currentTarget.setPointerCapture(pointerId);

      const onMove = (moveEvent: PointerEvent): void => {
        const toward =
          orientation === 'horizontal'
            ? moveEvent.clientX - start
            : moveEvent.clientY - start;
        const delta = primary === 'first' ? toward : -toward;
        const next = Math.min(max, Math.max(min, startValue + delta));
        onChange(Math.round(next));
      };

      const onUp = (): void => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [max, min, onChange, orientation, primary, value],
  );

  const style =
    orientation === 'horizontal'
      ? primary === 'second'
        ? { gridTemplateColumns: `minmax(0, 1fr) 8px ${value}px` }
        : { gridTemplateColumns: `${value}px 8px minmax(0, 1fr)` }
      : primary === 'second'
        ? { gridTemplateRows: `minmax(0, 1fr) 8px ${value}px` }
        : { gridTemplateRows: `${value}px 8px minmax(0, 1fr)` };

  return (
    <div
      ref={rootRef}
      className={`split-pane split-${orientation}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <div className="split-first">{first}</div>
      <button
        type="button"
        className="split-handle"
        aria-label={orientation === 'horizontal' ? 'Resize columns' : 'Resize rows'}
        onPointerDown={handlePointerDown}
      />
      <div className="split-second">{second}</div>
    </div>
  );
}
