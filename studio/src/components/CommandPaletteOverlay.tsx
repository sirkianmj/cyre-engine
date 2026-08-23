import { useEffect, useMemo, useRef, useState } from 'react';

import { useStudio } from '../studio/StudioContext';

export function CommandPaletteOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const { state, executeCommand } = useStudio();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const commands = state.commands.filter((command) => {
      if (!normalized) return true;
      const haystack = [command.id, command.label, command.category ?? '', command.shortcut ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
    return commands.slice(0, 24);
  }, [query, state.commands]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const run = (commandId: string): void => {
    executeCommand(commandId);
    onClose();
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette-card glass-strong"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          placeholder="Search commands, panels, and simulation actions…"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onClose();
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => Math.min(results.length - 1, index + 1));
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
              return;
            }
            if (event.key === 'Enter' && results[activeIndex]) {
              event.preventDefault();
              run(results[activeIndex].id);
            }
          }}
        />

        <div className="palette-list">
          {results.length === 0 ? (
            <div className="palette-empty">No matching commands.</div>
          ) : (
            results.map((command, index) => (
              <button
                key={command.id}
                type="button"
                className={`palette-item${index === activeIndex ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => run(command.id)}
              >
                <span>
                  <strong>{command.label}</strong>
                  <em>{command.category ?? 'General'}</em>
                </span>
                {command.shortcut && <kbd>{command.shortcut}</kbd>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
