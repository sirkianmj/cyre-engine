/**
 * CommandPalette
 * ---------------
 * The ⌘K palette. Every command in the registry is searchable and runs
 * through the same dispatch path as the menu bar, so there is exactly one
 * implementation of each action.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { useStudio } from '../studio/StudioContext';
import { Icon } from '../ui/Icons';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { commands, runCommand } = useStudio();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = Array.from(commands.values());
    if (needle === '') return all.slice(0, 40);

    return all
      .filter(
        (command) =>
          command.label.toLowerCase().includes(needle) ||
          command.category.toLowerCase().includes(needle) ||
          command.id.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(0);
  }, [activeIndex, results.length]);

  if (!open) return null;

  const execute = (commandId: string): void => {
    onClose();
    runCommand(commandId);
  };

  return (
    <div
      className="cyre-palette-backdrop"
      data-testid="command-palette"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="cyre-palette" role="dialog" aria-label="Command palette">
        <input
          ref={inputRef}
          className="cyre-palette-input"
          value={query}
          placeholder="Run a command…"
          aria-label="Search commands"
          data-testid="command-palette-input"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % Math.max(1, results.length));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + results.length) % Math.max(1, results.length));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const command = results[activeIndex];
              if (command) execute(command.id);
            }
          }}
        />

        <div className="cyre-palette-list" role="listbox">
          {results.length === 0 ? (
            <div className="cyre-palette-item" data-active={undefined}>
              <Icon name="search" size={14} />
              <span className="cyre-palette-label">No commands match "{query}"</span>
            </div>
          ) : (
            results.map((command, index) => (
              <button
                key={command.id}
                type="button"
                className="cyre-palette-item"
                role="option"
                aria-selected={index === activeIndex}
                data-active={index === activeIndex || undefined}
                data-testid={`palette-item-${command.id}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => execute(command.id)}
              >
                <span className="cyre-palette-label">{command.label}</span>
                <span className="cyre-palette-category">{command.category}</span>
                {command.shortcut ? <span className="cyre-menu-shortcut">{command.shortcut}</span> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
