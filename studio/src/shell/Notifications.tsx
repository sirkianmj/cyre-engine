/**
 * Notifications
 * --------------
 * Transient toasts for the most recent engine notifications, plus the modal
 * confirmation used by destructive commands.
 */

import { useEffect, useState } from 'react';

import { useStudio } from '../studio/StudioContext';
import { Icon } from '../ui/Icons';
import type { IconName } from '../ui/Icons';
import { Button } from '../ui/primitives';

const ICONS: Record<string, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  error: 'alert',
};

const VISIBLE = 4;
const AUTO_DISMISS_MS = 6000;

export function Notifications(): JSX.Element | null {
  const { state, application } = useStudio();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = state.notifications
    .filter((notification) => !dismissed.has(notification.id))
    .slice(-VISIBLE);

  useEffect(() => {
    if (visible.length === 0) return;

    const timers = visible.map((notification) =>
      window.setTimeout(() => {
        setDismissed((current) => new Set(current).add(notification.id));
      }, AUTO_DISMISS_MS),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <div className="cyre-toasts" role="log" aria-live="polite" data-testid="studio-toasts">
      {visible.map((notification) => (
        <div key={notification.id} className="cyre-toast" data-type={notification.type} data-testid={`toast-${notification.type}`}>
          <Icon name={ICONS[notification.type] ?? 'info'} size={14} />
          <span className="cyre-toast-body">{notification.message}</span>
          <button
            type="button"
            className="cyre-icon-btn"
            aria-label="Dismiss notification"
            onClick={() => {
              setDismissed((current) => new Set(current).add(notification.id));
              if (state.notifications.length <= 1) application.clearNotifications();
            }}
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog(): JSX.Element | null {
  const { confirmRequest, resolveConfirm } = useStudio();

  if (!confirmRequest) return null;

  return (
    <div className="cyre-confirm-backdrop" data-testid="confirm-dialog">
      <div className="cyre-confirm" role="alertdialog" aria-modal="true" aria-label={confirmRequest.title}>
        <h2>{confirmRequest.title}</h2>
        <p>{confirmRequest.message}</p>
        <div className="cyre-row" data-between="true">
          <Button onClick={() => resolveConfirm(false)} testId="confirm-cancel">Cancel</Button>
          <Button variant="danger" onClick={() => resolveConfirm(true)} testId="confirm-ok">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
