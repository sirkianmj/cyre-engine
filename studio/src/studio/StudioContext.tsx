import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { StudioApplication } from './StudioApplication';

export interface StudioNotification {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

export interface StudioState {
  application: StudioApplication;
  notifications: StudioNotification[];
}

const studioApplication = new StudioApplication();

let notifications: StudioNotification[] = [];
const listeners = new Set<() => void>();

const emitChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): StudioState => ({
  application: studioApplication,
  notifications,
});

const addNotification = (
  level: StudioNotification['level'],
  message: string,
): StudioNotification => {
  const notification: StudioNotification = {
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    timestamp: Date.now(),
  };

  notifications = [...notifications, notification];
  emitChange();

  return notification;
};

const removeNotification = (id: string): void => {
  notifications = notifications.filter((notification) => notification.id !== id);
  emitChange();
};

const clearNotifications = (): void => {
  notifications = [];
  emitChange();
};

export interface StudioContextValue extends StudioState {
  state: ReturnType<StudioApplication['getState']>;
  togglePanel: (panel: import('./StudioApplication').StudioPanelId) => void;
  setWorkspace: (workspace: import('./StudioApplication').StudioWorkspace) => void;
  notify: (
    level: StudioNotification['level'],
    message: string,
  ) => StudioNotification;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }): JSX.Element {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const value = useMemo<StudioContextValue>(
    () => ({
      ...state,
      state: state.application.getState(),
      togglePanel: (panel) => state.application.togglePanel(panel),
      setWorkspace: (workspace) => state.application.setWorkspace(workspace),
      notify: addNotification,
      removeNotification,
      clearNotifications,
    }),
    [state],
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
    throw new Error('useStudio must be used inside a StudioProvider.');
  }

  return context;
}

export const useStudioState = useStudio;

export { StudioContext };
