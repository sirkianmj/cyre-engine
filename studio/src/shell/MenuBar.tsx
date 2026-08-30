/**
 * MenuBar
 * --------
 * A native-style menu bar. Menus open on click, stay open while the pointer
 * moves across sibling triggers (as in macOS / Unreal), close on Escape or
 * outside click, and support full arrow-key navigation of the open popup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';

import { useStudio } from '../studio/StudioContext';
import { Icon } from '../ui/Icons';

import { STUDIO_MENUS } from './menuModel';
import type { MenuItemSpec } from './menuModel';

export function MenuBar(): JSX.Element {
  const { state, runCommand } = useStudio();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const barRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const openMenu = STUDIO_MENUS.find((menu) => menu.id === openMenuId) ?? null;

  const close = useCallback(() => {
    setOpenMenuId(null);
    setAnchor(null);
    setActiveIndex(-1);
  }, []);

  const openAt = useCallback((menuId: string, trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    setAnchor({ left: rect.left, top: rect.bottom + 2 });
    setOpenMenuId(menuId);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!openMenuId) return;

    const onPointerDown = (event: globalThis.MouseEvent): void => {
      const target = event.target as Node;
      if (barRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      close();
    };

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [openMenuId, close]);

  const focusRow = useCallback((index: number) => {
    const container = popoverRef.current;
    if (!container) return;
    const rows = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-menu-row="true"]'));
    const row = rows[index];
    row?.focus();
  }, []);

  useEffect(() => {
    if (activeIndex >= 0) focusRow(activeIndex);
  }, [activeIndex, focusRow, openMenuId]);

  const onPopoverKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (!openMenu) return;
    const rowCount = openMenu.items.length;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1 + rowCount) % rowCount);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + rowCount) % rowCount);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(rowCount - 1);
    }
  };

  const onBarKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = STUDIO_MENUS.findIndex((menu) => menu.id === openMenuId);
    if (index < 0) return;

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = STUDIO_MENUS[(index + delta + STUDIO_MENUS.length) % STUDIO_MENUS.length];
    const trigger = barRef.current?.querySelector<HTMLButtonElement>(`[data-menu="${next.id}"]`);
    if (trigger) openAt(next.id, trigger);
  };

  const handleTriggerClick = (event: ReactMouseEvent<HTMLButtonElement>, menuId: string): void => {
    if (openMenuId === menuId) {
      close();
      return;
    }
    openAt(menuId, event.currentTarget);
  };

  const handleTriggerEnter = (event: ReactMouseEvent<HTMLButtonElement>, menuId: string): void => {
    if (openMenuId === null || openMenuId === menuId) return;
    openAt(menuId, event.currentTarget);
  };

  const execute = (item: MenuItemSpec): void => {
    close();
    if (item.command) runCommand(item.command);
  };

  return (
    <div className="cyre-menubar" ref={barRef} onKeyDown={onBarKeyDown} data-testid="studio-menubar">
      <span className="cyre-menubar-brand">
        <Icon name="cyre" size={13} />
        CYRE Studio
      </span>

      {STUDIO_MENUS.map((menu) => (
        <button
          key={menu.id}
          type="button"
          className="cyre-menu-trigger"
          data-menu={menu.id}
          data-testid={`menu-${menu.id}`}
          aria-haspopup="menu"
          aria-expanded={openMenuId === menu.id}
          onClick={(event) => handleTriggerClick(event, menu.id)}
          onMouseEnter={(event) => handleTriggerEnter(event, menu.id)}
        >
          {menu.label}
        </button>
      ))}

      <span className="cyre-menubar-spacer" />

      <span className="cyre-menubar-meta">
        <span>{state.projectTitle}</span>
        <span aria-hidden="true">·</span>
        <span>{state.engineState.toUpperCase()}</span>
      </span>

      {openMenu && anchor ? (
        <div
          className="cyre-menu-popover"
          role="menu"
          aria-label={openMenu.label}
          data-testid={`menu-popover-${openMenu.id}`}
          ref={popoverRef}
          style={{ left: anchor.left, top: anchor.top }}
          onKeyDown={onPopoverKeyDown}
        >
          {openMenu.items.map((item, index) => {
            if (item.separator) {
              return <div key={item.id} className="cyre-menu-separator" role="separator" />;
            }

            const disabled = item.disabled?.(state) ?? false;
            const checked = item.checked?.(state) ?? false;
            const hint = item.hint?.(state);

            if (!item.command) {
              return (
                <div key={item.id} className="cyre-menu-static">
                  {item.label}
                  {hint ? ` — ${hint}` : ''}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                className="cyre-menu-row"
                role="menuitem"
                data-menu-row="true"
                data-testid={`menu-item-${item.id}`}
                disabled={disabled}
                aria-checked={checked}
                onClick={() => execute(item)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {checked ? (
                  <span className="cyre-menu-check">
                    <Icon name="check" size={11} />
                  </span>
                ) : null}
                <span className="cyre-menu-label">{item.label}</span>
                {hint ? <span className="cyre-menu-hint">{hint}</span> : null}
                {item.shortcut ? <span className="cyre-menu-shortcut">{item.shortcut}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
