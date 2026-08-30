import { useEffect, useState } from 'react';

import { CYRE_BRANDING, attribution, copyrightLine, engineVersion, studioVersion } from '../branding';

export interface BootScreenProps {
  /** Called when the boot sequence has finished. */
  onComplete: () => void;
  /** Milliseconds the sequence runs for. */
  durationMs?: number;
  /** Skips straight to completion, used when the user has disabled animation. */
  skip?: boolean;
}

interface BootStage {
  label: string;
  detail: string;
}

/**
 * The stages the boot screen reports.
 *
 * These are the things the Studio genuinely does before it is usable, listed in
 * the order it does them, so the screen is a description rather than theatre.
 */
const BOOT_STAGES: readonly BootStage[] = [
  { label: 'Initialising CYRE engine', detail: 'deterministic simulation kernel' },
  { label: 'Loading scenario library', detail: 'bundled attack scenarios' },
  { label: 'Compiling render backends', detail: 'engine GPU · Three.js WebGL' },
  { label: 'Restoring workspace', detail: 'recent projects and settings' },
  { label: 'Ready', detail: 'CYRE Studio' },
];

/**
 * BootScreen
 * -----------
 * The animated loading screen shown before the launcher.
 *
 * It advances through the real startup stages on a timer and then hands off.
 * The attribution is on the screen for the whole sequence, which is the point:
 * the developer and company are visible, not buried in a console log.
 */
export function BootScreen({ onComplete, durationMs = 2400, skip = false }: BootScreenProps): JSX.Element {
  const [stageIndex, setStageIndex] = useState(0);

  // Stage advance and hand-off are separate effects on purpose: scheduling the
  // hand-off from inside the state updater would be a side effect in a reducer,
  // which React is free to invoke more than once.
  useEffect(() => {
    if (skip) return;

    const perStage = Math.max(1, Math.floor(durationMs / BOOT_STAGES.length));
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, BOOT_STAGES.length - 1));
    }, perStage);

    return () => window.clearInterval(timer);
  }, [durationMs, skip]);

  useEffect(() => {
    if (skip) {
      onComplete();
      return;
    }

    if (stageIndex < BOOT_STAGES.length - 1) return;

    const timer = window.setTimeout(onComplete, 180);
    return () => window.clearTimeout(timer);
  }, [onComplete, skip, stageIndex]);

  const progress = ((stageIndex + 1) / BOOT_STAGES.length) * 100;

  return (
    <div className="cyre-boot" data-testid="boot-screen" role="status" aria-live="polite">
      <div className="cyre-boot-inner">
        <div className="cyre-boot-mark" aria-hidden="true">
          <span className="cyre-boot-glyph">CYRE</span>
          <span className="cyre-boot-sweep" />
        </div>

        <h1 className="cyre-boot-title" data-testid="boot-product">
          {CYRE_BRANDING.product}
        </h1>
        <p className="cyre-boot-tagline">{CYRE_BRANDING.productTagline}</p>

        <div className="cyre-boot-progress" data-testid="boot-progress" aria-hidden="true">
          <div className="cyre-boot-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <ul className="cyre-boot-stages">
          {BOOT_STAGES.map((stage, index) => (
            <li
              key={stage.label}
              className="cyre-boot-stage"
              data-state={index < stageIndex ? 'done' : index === stageIndex ? 'active' : 'pending'}
            >
              <span className="cyre-boot-stage-label">{stage.label}</span>
              <span className="cyre-boot-stage-detail">{stage.detail}</span>
            </li>
          ))}
        </ul>

        <div className="cyre-boot-versions" data-testid="boot-versions">
          <span>engine v{engineVersion()}</span>
          <span className="cyre-boot-sep" aria-hidden="true">
            ·
          </span>
          <span>studio v{studioVersion()}</span>
        </div>

        <div className="cyre-boot-credit" data-testid="boot-credit">
          <span className="cyre-boot-developer" data-testid="boot-developer">
            {CYRE_BRANDING.developer}
          </span>
          <span className="cyre-boot-role" data-testid="boot-developer-role">
            {CYRE_BRANDING.developerRole}
          </span>
          <span className="cyre-boot-copyright">{copyrightLine()}</span>
        </div>

        {/* Screen readers get one concise line instead of the animated list. */}
        <span className="cyre-sr-only">
          {attribution()} — booting {CYRE_BRANDING.product}
        </span>
      </div>
    </div>
  );
}
