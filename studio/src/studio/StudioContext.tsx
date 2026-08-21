import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

import type { ReactNode } from 'react';

import {
  StudioApplication,
} from './StudioApplication';

import type {
  StudioSnapshot,
} from './StudioApplication';

export type StudioNotificationLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'success';

export interface StudioContextValue {
  application: StudioApplication;
  state: StudioSnapshot;

  togglePanel: (panelId: string) => void;
  setWorkspace: (workspaceId: string) => void;

  notify: (
    level: StudioNotificationLevel,
    message: string,
  ) => void;

  clearNotifications: () => void;

  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  restart: () => void;
  setSimulationSpeed: (speed: number) => void;
  executeCommand: (commandId: string) => void;
}

const studioApplication = new StudioApplication();

const subscribe = (onStoreChange: () => void): (() => void) =>
  studioApplication.subscribe(onStoreChange);

const getSnapshot = (): StudioSnapshot =>
  studioApplication.getState();

const StudioContext =
  createContext<StudioContextValue | null>(null);

export function StudioProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const value = useMemo<StudioContextValue>(
    () => ({
      application: studioApplication,
      state: snapshot,

      togglePanel: (panelId) =>
        studioApplication.togglePanel(panelId),

      setWorkspace: (workspaceId) =>
        studioApplication.setWorkspace(workspaceId),

      notify: (level, message) =>
        studioApplication.notify(level, message),

      clearNotifications: () =>
        studioApplication.clearNotifications(),

      play: () => studioApplication.play(),
      pause: () => studioApplication.pause(),
      resume: () => studioApplication.resume(),
      stop: () => studioApplication.stop(),
      restart: () => studioApplication.restart(),

      setSimulationSpeed: (speed) =>
        studioApplication.setSimulationSpeed(speed),

      executeCommand: (commandId) =>
        studioApplication.executeCommand(commandId),
    }),
    [snapshot],
  );

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);

  if (!context) {
    throw new Error(
      'useStudio must be used inside StudioProvider.',
    );
  }

  return context;
}
