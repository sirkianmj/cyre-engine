import { AccessibilitySettings } from './AccessibilitySettings.js';
import { DesignSystem } from './DesignSystem.js';
import { FeedbackSystem } from './FeedbackSystem.js';
import { MotionSystem } from './MotionSystem.js';
import { UIComponentRegistry } from './UIComponentRegistry.js';
import { VisualPolishSystem } from './VisualPolishSystem.js';
import {
  UX_AUDIT_CATEGORIES,
  UX_AUDIT_SEVERITIES,
  isUxAuditCategory,
  isUxAuditSeverity,
  type UxAuditCategory,
  type UxAuditIssue,
  type UxAuditReport,
  type UxAuditSeverity,
  type UxAuditSystemOptions,
} from './UxAuditTypes.js';

function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export class UxAuditSystem {
  readonly name: string;
  private readonly accessibility?: AccessibilitySettings;
  private readonly motion?: MotionSystem;
  private readonly visualPolish?: VisualPolishSystem;
  private readonly designSystem?: DesignSystem;
  private readonly components?: UIComponentRegistry;
  private readonly feedback?: FeedbackSystem;
  private issueCounter = 0;

  constructor(options: UxAuditSystemOptions = {}) {
    this.validateOptions(options);

    this.name = options.name ?? 'CYRE UX Audit';
    this.accessibility = options.accessibility;
    this.motion = options.motion;
    this.visualPolish = options.visualPolish;
    this.designSystem = options.designSystem;
    this.components = options.components;
    this.feedback = options.feedback;
  }

  audit(): UxAuditReport {
    const issues: UxAuditIssue[] = [];

    this.auditAccessibility(issues);
    this.auditMotion(issues);
    this.auditVisualPolish(issues);
    this.auditDesignSystem(issues);
    this.auditComponents(issues);
    this.auditFeedback(issues);

    const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
    const infoCount = issues.filter((issue) => issue.severity === 'info').length;

    return {
      name: this.name,
      timestamp: Date.now(),
      issueCount: issues.length,
      criticalCount,
      warningCount,
      infoCount,
      passed: criticalCount === 0,
      issues,
      summary: [
        this.name,
        `${issues.length} issues`,
        `critical=${criticalCount}`,
        `warning=${warningCount}`,
        `info=${infoCount}`,
        criticalCount === 0 ? 'passed' : 'failed',
      ].join(' | '),
    };
  }

  validate(): void {
    assertNonEmpty(this.name, 'UxAuditSystem name');
    if (this.accessibility && !(this.accessibility instanceof AccessibilitySettings)) {
      throw new Error('UxAuditSystem accessibility must be an AccessibilitySettings instance.');
    }
    if (this.motion && !(this.motion instanceof MotionSystem)) {
      throw new Error('UxAuditSystem motion must be a MotionSystem instance.');
    }
    if (this.visualPolish && !(this.visualPolish instanceof VisualPolishSystem)) {
      throw new Error('UxAuditSystem visualPolish must be a VisualPolishSystem instance.');
    }
    if (this.designSystem && !(this.designSystem instanceof DesignSystem)) {
      throw new Error('UxAuditSystem designSystem must be a DesignSystem instance.');
    }
    if (this.components && !(this.components instanceof UIComponentRegistry)) {
      throw new Error('UxAuditSystem components must be a UIComponentRegistry instance.');
    }
    if (this.feedback && !(this.feedback instanceof FeedbackSystem)) {
      throw new Error('UxAuditSystem feedback must be a FeedbackSystem instance.');
    }
  }

  private auditAccessibility(issues: UxAuditIssue[]): void {
    const settings = this.accessibility?.getSettings();
    if (!settings) return;

    const fontScale = settings.fontSizeScale;
    if (fontScale < 0.75 || fontScale > 1.75) {
      this.addIssue(issues, 'accessibility', 'warning', {
        message: `Font size scale ${fontScale} may cause layout issues.`,
        source: 'accessibility-settings',
      });
    }

    const motionReduced = this.motion?.isMotionReduced();
    if (motionReduced !== undefined && settings.reduceMotion !== motionReduced) {
      this.addIssue(issues, 'accessibility', 'critical', {
        message:
          'Reduce motion setting is inconsistent between accessibility settings and motion system.',
        source: 'accessibility-settings',
      });
    }

    if (!settings.highContrast && !settings.colorblindMode) {
      this.addIssue(issues, 'accessibility', 'info', {
        message:
          'High contrast and colorblind modes are disabled. Consider enabling one for improved accessibility.',
        source: 'accessibility-settings',
      });
    }

    const visualColorblindSafe = this.visualPolish?.getProfile().colorblindSafe;
    if (
      visualColorblindSafe !== undefined &&
      visualColorblindSafe !== settings.colorblindMode
    ) {
      this.addIssue(issues, 'visual', 'warning', {
        message:
          'Colorblind safety setting is inconsistent between accessibility and visual polish profile.',
        source: 'visual-polish',
      });
    }
  }

  private auditMotion(issues: UxAuditIssue[]): void {
    if (!this.motion) return;

    if (this.motion.isMotionReduced() && this.motion.getDurationMs() !== 0) {
      this.addIssue(issues, 'motion', 'critical', {
        message:
          'Motion reduction is enabled, but effective motion duration is not zero.',
        source: 'motion-system',
      });
    }

    if (this.motion.getDurationMs() > 400) {
      this.addIssue(issues, 'motion', 'warning', {
        message: 'Motion duration exceeds the recommended maximum of 400ms.',
        source: 'motion-system',
      });
    }

    if (this.motion.getDelayMs() > 250) {
      this.addIssue(issues, 'motion', 'warning', {
        message: 'Motion delay exceeds the recommended maximum of 250ms.',
        source: 'motion-system',
      });
    }
  }

  private auditVisualPolish(issues: UxAuditIssue[]): void {
    if (!this.visualPolish) return;

    const snapshot = this.visualPolish.createSnapshot();
    if (!snapshot.activeThemeId || snapshot.activeThemeId.trim() === '') {
      this.addIssue(issues, 'visual', 'critical', {
        message: 'Visual polish system has no active theme.',
        source: 'visual-polish',
      });
    }

    const colorValues = Object.values(snapshot.activeTheme.tokens.colors);
    if (colorValues.some((value) => typeof value !== 'string' || value.trim() === '')) {
      this.addIssue(issues, 'visual', 'critical', {
        message: 'Active UI theme contains an empty or invalid color token.',
        source: 'visual-polish',
      });
    }

    if (!snapshot.profile.colorblindSafe && !snapshot.profile.highContrast) {
      this.addIssue(issues, 'visual', 'info', {
        message:
          'Visual polish profile does not enable colorblind-safe or high-contrast mode.',
        source: 'visual-polish',
      });
    }
  }

  private auditDesignSystem(issues: UxAuditIssue[]): void {
    if (!this.designSystem) return;

    const tokens = this.designSystem.listTokens();
    if (tokens.length === 0) {
      this.addIssue(issues, 'visual', 'warning', {
        message: 'Design system contains no tokens.',
        source: 'design-system',
      });
    }

    const hasColorToken = tokens.some((token) => token.category === 'color');
    if (!hasColorToken && tokens.length > 0) {
      this.addIssue(issues, 'visual', 'warning', {
        message: 'Design system has no color tokens.',
        source: 'design-system',
      });
    }
  }

  private auditComponents(issues: UxAuditIssue[]): void {
    if (!this.components) return;

    for (const componentId of this.components.listIds()) {
      let componentType: string | undefined;
      try {
        const rendered = this.components.render(componentId);
        componentType = rendered.componentType;
      } catch (error) {
        this.addIssue(issues, 'component', 'critical', {
          message: `UI component "${componentId}" threw during render: ${(error as Error).message}`,
          source: componentId,
        });
        continue;
      }

      if (!componentType || componentType.trim() === '') {
        this.addIssue(issues, 'component', 'critical', {
          message: `UI component "${componentId}" rendered without a component type.`,
          source: componentId,
        });
      }
    }
  }

  private auditFeedback(issues: UxAuditIssue[]): void {
    if (!this.feedback) return;

    const unreadCount = this.feedback.getUnread().length;
    if (unreadCount > 20) {
      this.addIssue(issues, 'feedback', 'warning', {
        message: `Feedback system has ${unreadCount} unread messages.`,
        source: 'feedback-system',
      });
    }
  }

  private addIssue(
    issues: UxAuditIssue[],
    category: UxAuditCategory,
    severity: UxAuditSeverity,
    data: { message: string; source?: string },
  ): void {
    assertNonEmpty(category, 'Audit category');
    assertNonEmpty(severity, 'Audit severity');
    assertNonEmpty(data.message, 'Audit message');

    if (!isUxAuditCategory(category)) {
      throw new Error(`Invalid UX audit category "${category}".`);
    }
    if (!isUxAuditSeverity(severity)) {
      throw new Error(`Invalid UX audit severity "${severity}".`);
    }

    this.issueCounter += 1;
    issues.push({
      id: `ux-audit-${this.issueCounter}`,
      category,
      severity,
      message: data.message,
      source: data.source,
    });
  }

  private validateOptions(options: UxAuditSystemOptions): void {
    if (!isRecord(options)) {
      throw new Error('UxAuditSystem options must be an object.');
    }
    if (options.name !== undefined && typeof options.name === 'string' && options.name.trim() === '') {
      throw new Error('UxAuditSystem name cannot be empty if provided.');
    }
  }
}
