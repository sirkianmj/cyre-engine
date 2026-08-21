import { useStudioState } from '../studio/StudioContext';

export function NotificationCenter(): JSX.Element {
  const state = useStudioState();

  if (state.notifications.length === 0) {
    return <div className="notification-center notification-center--empty" />;
  }

  return (
    <aside className="notification-center" aria-label="Notifications">
      {state.notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification--${notification.level}`}
          role={notification.level === 'error' ? 'alert' : 'status'}
        >
          <div className="notification__content">
            <span className="notification__level">
              {notification.level.toUpperCase()}
            </span>
            <span className="notification__message">
              {notification.message}
            </span>
          </div>

          <button
            type="button"
            className="notification__dismiss"
            aria-label={`Dismiss notification: ${notification.message}`}
            onClick={() => state.removeNotification(notification.id)}
          >
            ×
          </button>
        </div>
      ))}
    </aside>
  );
}
