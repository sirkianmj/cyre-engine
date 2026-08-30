import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface ViewportContextAction {
  id: string;
  label: string;
  onSelect: () => void;
  /** Renders a separator above this action. */
  separatorBefore?: boolean;
  disabled?: boolean;
}

export interface ViewportContextMenuProps {
  /** Position in CSS pixels relative to the offset parent (the viewport). */
  x: number;
  y: number;
  title: string;
  actions: readonly ViewportContextAction[];
  onClose: () => void;
}

/**
 * ViewportContextMenu
 * --------------------
 * The right-click menu for a viewport asset.
 *
 * It is a real menu, not a decorative list: actions run commands against the
 * engine session, Escape and an outside click dismiss it, and it repositions
 * itself so it never opens off the edge of the viewport.
 */
export function ViewportContextMenu({
  x,
  y,
  title,
  actions,
  onClose,
}: ViewportContextMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState({ left: x, top: y });

  // Keep the menu inside the viewport. Measuring after layout is the only way
  // to know the real size, so the first paint may briefly use the raw point;
  // useLayoutEffect corrects it before the browser paints.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const parent = menu?.offsetParent as HTMLElement | null;
    if (!menu || !parent) return;

    const bounds = parent.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;

    setPlacement({
      left: Math.max(4, Math.min(x, Math.max(4, bounds.width - width - 4))),
      top: Math.max(4, Math.min(y, Math.max(4, bounds.height - height - 4))),
    });
  }, [x, y]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    const onPointerDown = (event: MouseEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="cyre-context-menu"
      role="menu"
      aria-label={`Actions for ${title}`}
      data-testid="viewport-context-menu"
      data-target={title}
      onContextMenu={(event) => event.preventDefault()}
      style={{ position: 'absolute', left: placement.left, top: placement.top }}
    >
      <div className="cyre-context-menu-title" data-testid="viewport-context-menu-title">
        {title}
      </div>

      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          className="cyre-context-menu-item"
          data-testid={`viewport-context-action-${action.id}`}
          disabled={action.disabled === true}
          onClick={() => {
            action.onSelect();
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}

      {actions.length === 0 ? (
        <div className="cyre-context-menu-empty">No actions available</div>
      ) : null}
    </div>
  );
}
