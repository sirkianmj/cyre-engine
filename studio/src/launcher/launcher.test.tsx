/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CYRE_BRANDING, attribution, copyrightLine, engineVersion, studioVersion } from '../branding';
import { BootScreen } from './BootScreen';
import { LauncherApp } from './LauncherApp';
import { MemoryLauncherStorage, ProjectStore } from './projectStore';

import type { LauncherProject } from './projectStore';

const NO_WEBGL = {
  webgl2: false,
  webgl1: false,
  gpu: 'unknown',
  vendor: 'unknown',
  deviceMemoryGb: null,
  hardwareConcurrency: null,
  devicePixelRatio: 1,
};

const WEBGL2 = { ...NO_WEBGL, webgl2: true, webgl1: true, gpu: 'ANGLE (Test GPU)' };

function makeStore(): ProjectStore {
  let clock = Date.parse('2026-08-28T10:00:00.000Z');
  let n = 0;
  return new ProjectStore(
    new MemoryLauncherStorage(),
    () => {
      clock += 1000;
      return new Date(clock);
    },
    () => `p${(n += 1)}`,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('branding', () => {
  it('names the developer and company', () => {
    expect(CYRE_BRANDING.developer).toBe('Kian Mansouri Jamshidi');
    expect(CYRE_BRANDING.developerRole).toBe('Founder of Forgex4');
    expect(CYRE_BRANDING.company).toBe('Forgex4');
  });

  it('formats the attribution and copyright lines', () => {
    expect(attribution()).toBe('Kian Mansouri Jamshidi · Founder of Forgex4');
    expect(copyrightLine()).toMatch(/^© \d{4} Forgex4$/);
  });

  it('reports the real injected versions, not a placeholder', () => {
    // The build injects these from package.json. If the injection is missing the
    // module says 'unknown' rather than inventing a number, and a hard-coded
    // '1.0.4' in a component would not be caught — so assert both here.
    expect(engineVersion()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(studioVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('BootScreen', () => {
  it('shows the product, versions and the developer credit', () => {
    render(<BootScreen onComplete={() => undefined} durationMs={10000} />);

    expect(screen.getByTestId('boot-product').textContent).toBe(CYRE_BRANDING.product);
    expect(screen.getByTestId('boot-versions').textContent).toContain(`v${engineVersion()}`);
    expect(screen.getByTestId('boot-developer').textContent).toBe('Kian Mansouri Jamshidi');
    expect(screen.getByTestId('boot-developer-role').textContent).toBe('Founder of Forgex4');
  });

  it('advances through the startup stages', async () => {
    vi.useFakeTimers();
    render(<BootScreen onComplete={() => undefined} durationMs={500} />);

    const stages = (): string[] =>
      Array.from(document.querySelectorAll('.cyre-boot-stage')).map(
        (element) => element.getAttribute('data-state') ?? '',
      );

    expect(stages()[0]).toBe('active');
    expect(stages().filter((state) => state === 'done')).toHaveLength(0);

    // Timer callbacks update React state, so the advance has to run inside
    // act() or the DOM will not have caught up when we read it.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(stages().filter((state) => state === 'done')).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(stages().filter((state) => state === 'pending')).toHaveLength(0);
  });

  it('hands off when the sequence finishes', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<BootScreen onComplete={onComplete} durationMs={300} />);

    expect(onComplete).not.toHaveBeenCalled();

    // Time is stepped rather than jumped: React batches the state updates from
    // the interval callbacks, so a single large advance would reach the final
    // stage only after the timers had already been moved past the hand-off.
    for (let step = 0; step < 20; step += 1) {
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips straight past when animation is disabled', () => {
    const onComplete = vi.fn();
    render(<BootScreen onComplete={onComplete} skip />);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('LauncherApp', () => {
  it('shows an empty recent list before any project exists', () => {
    render(<LauncherApp store={makeStore()} hardware={NO_WEBGL} onLaunch={() => undefined} />);

    expect(screen.getByTestId('launcher-empty')).toBeTruthy();
    expect(screen.getByTestId('launcher-developer').textContent).toBe('Kian Mansouri Jamshidi');
    expect(screen.getByTestId('launcher-engine-version').textContent).toBe(`v${engineVersion()}`);
  });

  it('creates a project from the form and lists it', () => {
    const store = makeStore();
    render(<LauncherApp store={store} hardware={WEBGL2} onLaunch={() => undefined} />);

    fireEvent.change(screen.getByTestId('launcher-new-name'), {
      target: { value: 'Financial Network' },
    });
    fireEvent.click(screen.getByTestId('launcher-create'));

    expect(screen.queryByTestId('launcher-empty')).toBeNull();
    expect(store.listProjects()).toHaveLength(1);
    expect(store.listProjects()[0]?.name).toBe('Financial Network');
  });

  it('rejects a blank project name with a visible error', () => {
    render(<LauncherApp store={makeStore()} hardware={NO_WEBGL} onLaunch={() => undefined} />);

    fireEvent.click(screen.getByTestId('launcher-create'));

    expect(screen.getByTestId('launcher-error').textContent).toMatch(/needs a name/);
  });

  it('launches the chosen project and records that it was opened', () => {
    const store = makeStore();
    const created = store.createProject({ name: 'Alpha', scenarioId: 'fintech-breach' });
    const onLaunch = vi.fn();

    render(<LauncherApp store={store} hardware={WEBGL2} onLaunch={onLaunch} />);

    fireEvent.click(screen.getByTestId(`launcher-open-${created.id}`));

    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect((onLaunch.mock.calls[0]?.[0] as LauncherProject).name).toBe('Alpha');
  });

  it('continues the most recently opened project', () => {
    const store = makeStore();
    store.createProject({ name: 'Older' });
    const newer = store.createProject({ name: 'Newer' });

    const onLaunch = vi.fn();
    render(<LauncherApp store={store} hardware={WEBGL2} onLaunch={onLaunch} />);

    expect(screen.getByTestId('launcher-continue').textContent).toContain('Newer');
    fireEvent.click(screen.getByTestId('launcher-continue'));

    expect((onLaunch.mock.calls[0]?.[0] as LauncherProject).id).toBe(newer.id);
  });

  it('edits project settings in place', () => {
    const store = makeStore();
    const project = store.createProject({ name: 'Alpha' });

    render(<LauncherApp store={store} hardware={WEBGL2} onLaunch={() => undefined} />);
    fireEvent.click(screen.getByTestId(`launcher-select-${project.id}`));

    fireEvent.change(screen.getByTestId('launcher-settings-name'), {
      target: { value: 'Alpha Renamed' },
    });
    fireEvent.click(
      within(screen.getByTestId('launcher-settings-mode')).getByText('2.5D'),
    );
    fireEvent.click(
      within(screen.getByTestId('launcher-settings-renderer')).getByText('Three.js WebGL'),
    );

    const updated = store.getProject(project.id);

    expect(updated?.name).toBe('Alpha Renamed');
    expect(updated?.renderMode).toBe('2.5d');
    expect(updated?.renderer).toBe('three-webgl');
  });

  it('deletes a project', () => {
    const store = makeStore();
    const project = store.createProject({ name: 'Doomed' });

    render(<LauncherApp store={store} hardware={WEBGL2} onLaunch={() => undefined} />);
    fireEvent.click(screen.getByTestId(`launcher-delete-${project.id}`));

    expect(store.listProjects()).toEqual([]);
    expect(screen.getByTestId('launcher-empty')).toBeTruthy();
  });

  it('persists launcher defaults across instances', () => {
    const storage = new MemoryLauncherStorage();
    const first = new ProjectStore(storage);

    const { unmount } = render(
      <LauncherApp store={first} hardware={WEBGL2} onLaunch={() => undefined} />,
    );

    fireEvent.click(
      within(screen.getByTestId('launcher-default-renderer')).getByText('Three.js WebGL'),
    );
    fireEvent.click(screen.getByTestId('launcher-boot-animation'));

    expect(first.getSettings().renderer).toBe('three-webgl');
    expect(first.getSettings().showBootAnimation).toBe(false);

    unmount();

    // A second launcher over the same storage sees the same defaults.
    const second = new ProjectStore(storage);
    expect(second.getSettings().renderer).toBe('three-webgl');
    expect(second.getSettings().showBootAnimation).toBe(false);
  });

  it('warns when the platform has no WebGL2', () => {
    render(<LauncherApp store={makeStore()} hardware={NO_WEBGL} onLaunch={() => undefined} />);

    expect(screen.getByTestId('launcher-renderer-suggestion').textContent).toContain(
      'no WebGL2',
    );
  });

  it('reports the suggested renderer when WebGL2 is present', () => {
    render(<LauncherApp store={makeStore()} hardware={WEBGL2} onLaunch={() => undefined} />);

    expect(screen.getByTestId('launcher-renderer-suggestion').textContent).toContain(
      'Engine GPU',
    );
  });

  it('shows the detected hardware', () => {
    render(<LauncherApp store={makeStore()} hardware={WEBGL2} onLaunch={() => undefined} />);

    expect(screen.getByTestId('launcher-hardware').textContent).toContain('WebGL2');
    expect(screen.getByTestId('launcher-hardware').textContent).toContain('ANGLE (Test GPU)');
  });

  it('lists projects most recently opened first', () => {
    const store = makeStore();
    store.createProject({ name: 'First' });
    store.createProject({ name: 'Second' });

    render(<LauncherApp store={store} hardware={WEBGL2} onLaunch={() => undefined} />);

    const names = Array.from(
      document.querySelectorAll('.cyre-launcher-project-name'),
    ).map((element) => element.textContent);

    expect(names).toEqual(['Second', 'First']);
  });
});
