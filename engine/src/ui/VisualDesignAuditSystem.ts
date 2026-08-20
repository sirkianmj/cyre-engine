import { DesignSystem } from './DesignSystem.js';
import {
  UIThemeManager,
  type UIThemeDefinition,
} from './UIThemeManager.js';
import { VisualPolishSystem } from './VisualPolishSystem.js';
import {
  isVisualDesignAuditCategory,
  normalizeAuditSeverity,
  type VisualDesignAuditCategory,
  type VisualDesignAuditIssue,
  type VisualDesignAuditReport,
  type VisualDesignAuditSystemOptions,
} from './VisualDesignAuditTypes.js';
import type {
  UxAuditSeverity,
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

const REQUIRED_DESIGN_TOKENS = [
  'color.background',
  'color.surface',
  'color.primary',
  'color.danger',
  'typography.family',
  'typography.baseSize',
  'spacing.md',
  'motion.fast',
  'radii.medium',
  'component.button.height',
] as const;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export class VisualDesignAuditSystem {
  readonly name: string;
  private readonly themeManager?: UIThemeManager;
  private readonly designSystem?: DesignSystem;
  private readonly visualPolish?: VisualPolishSystem;
  private issueCounter = 0;

  constructor(options: VisualDesignAuditSystemOptions = {}) {
    this.validateOptions(options);

    this.name = options.name ?? 'CYRE Visual Design Audit';
    this.themeManager = options.themeManager;
    this.designSystem = options.designSystem;
    this.visualPolish = options.visualPolish;
  }

  audit(): VisualDesignAuditReport {
    const issues: VisualDesignAuditIssue[] = [];

    this.auditThemes(issues);
    this.auditDesignSystem(issues);
    this.auditVisualPolish(issues);

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
    assertNonEmpty(this.name, 'VisualDesignAuditSystem name');
    if (this.themeManager && !(this.themeManager instanceof UIThemeManager)) {
      throw new Error('VisualDesignAuditSystem themeManager must be a UIThemeManager instance.');
    }
    if (this.designSystem && !(this.designSystem instanceof DesignSystem)) {
      throw new Error('VisualDesignAuditSystem designSystem must be a DesignSystem instance.');
    }
    if (this.visualPolish && !(this.visualPolish instanceof VisualPolishSystem)) {
      throw new Error('VisualDesignAuditSystem visualPolish must be a VisualPolishSystem instance.');
    }
  }

  private auditThemes(issues: VisualDesignAuditIssue[]): void {
    if (!this.themeManager) return;

    const themes = this.themeManager.listThemes();
    if (themes.length === 0) {
      this.addIssue(issues, 'theme', 'critical', {
        message: 'No UI themes are registered.',
        source: 'theme-manager',
      });
      return;
    }

    const activeThemeId = this.themeManager.getActiveThemeId();
    if (!activeThemeId || activeThemeId.trim() === '') {
      this.addIssue(issues, 'theme', 'critical', {
        message: 'No active UI theme is selected.',
        source: 'theme-manager',
      });
    }

    const themeIds = new Set<string>();
    for (const theme of themes) {
      if (themeIds.has(theme.id)) {
        this.addIssue(issues, 'theme', 'critical', {
          message: `Duplicate theme id "${theme.id}".`,
          source: theme.id,
        });
      }
      themeIds.add(theme.id);
      this.auditSingleTheme(theme, issues);
    }
  }

  private auditSingleTheme(
    theme: UIThemeDefinition,
    issues: VisualDesignAuditIssue[],
  ): void {
    const source = `theme:${theme.id}`;
    const tokens = theme.tokens;

    this.auditColors(theme, issues);
    this.auditTypography(tokens.typography, issues, source);
    this.auditSpacing(tokens.spacing, issues, source);
    this.auditMotion(tokens.motion, issues, source);
    this.auditRadii(tokens.radii, issues, source);
  }

  private auditColors(
    theme: UIThemeDefinition,
    issues: VisualDesignAuditIssue[],
  ): void {
    const source = `theme:${theme.id}`;
    const colors = theme.tokens.colors;

    for (const [tokenName, value] of Object.entries(colors)) {
      if (!HEX_COLOR_PATTERN.test(value)) {
        this.addIssue(issues, 'color', 'critical', {
          message: `Theme "${theme.id}" color token "${tokenName}" is not a six-digit hex color.`,
          source,
        });
      }
    }

    this.auditContrast(
      colors.background,
      colors.textPrimary,
      'background/textPrimary',
      source,
      issues,
    );

    this.auditContrast(
      colors.surface,
      colors.textSecondary,
      'surface/textSecondary',
      source,
      issues,
    );

    this.auditContrast(
      colors.background,
      colors.primary,
      'background/primary',
      source,
      issues,
      3,
    );
  }

  private auditContrast(
    foreground: string,
    background: string,
    label: string,
    source: string,
    issues: VisualDesignAuditIssue[],
    criticalThreshold = 3,
  ): void {
    if (!HEX_COLOR_PATTERN.test(foreground) || !HEX_COLOR_PATTERN.test(background)) {
      return;
    }

    const ratio = this.contrastRatio(foreground, background);
    if (ratio < criticalThreshold) {
      this.addIssue(issues, 'color', 'critical', {
        message: `Color contrast for ${label} is ${ratio.toFixed(2)}:1, below the critical threshold of ${criticalThreshold}:1.`,
        source,
      });
    } else if (ratio < 4.5) {
      this.addIssue(issues, 'color', 'warning', {
        message: `Color contrast for ${label} is ${ratio.toFixed(2)}:1, below the recommended threshold of 4.5:1.`,
        source,
      });
    }
  }

  private auditTypography(
    typography: UIThemeDefinition['tokens']['typography'],
    issues: VisualDesignAuditIssue[],
    source: string,
  ): void {
    if (typography.baseSize <= 0) {
      this.addIssue(issues, 'typography', 'critical', {
        message: `Theme "${source}" base font size must be positive.`,
        source,
      });
    }

    if (typography.lineHeight <= 0) {
      this.addIssue(issues, 'typography', 'critical', {
        message: `Theme "${source}" line height must be positive.`,
        source,
      });
    }

    if (
      typography.h1Size < typography.h2Size ||
      typography.h2Size < typography.h3Size ||
      typography.h3Size < typography.baseSize
    ) {
      this.addIssue(issues, 'typography', 'warning', {
        message: `Theme "${source}" typography sizes should follow h1 > h2 > h3 > base size.`,
        source,
      });
    }
  }

  private auditSpacing(
    spacing: UIThemeDefinition['tokens']['spacing'],
    issues: VisualDesignAuditIssue[],
    source: string,
  ): void {
    const values = [spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl];
    if (!this.isStrictlyIncreasing(values)) {
      this.addIssue(issues, 'spacing', 'critical', {
        message: `Theme "${source}" spacing scale must be strictly increasing.`,
        source,
      });
    }
  }

  private auditMotion(
    motion: UIThemeDefinition['tokens']['motion'],
    issues: VisualDesignAuditIssue[],
    source: string,
  ): void {
    const durations = [motion.durationFast, motion.durationNormal, motion.durationSlow];
    if (!this.isNonDecreasing(durations) || durations.some((value) => value < 0)) {
      this.addIssue(issues, 'motion', 'critical', {
        message: `Theme "${source}" motion durations must be non-negative and non-decreasing.`,
        source,
      });
    }
  }

  private auditRadii(
    radii: UIThemeDefinition['tokens']['radii'],
    issues: VisualDesignAuditIssue[],
    source: string,
  ): void {
    const values = [radii.small, radii.medium, radii.large];
    if (!this.isNonDecreasing(values) || values.some((value) => value < 0)) {
      this.addIssue(issues, 'radii', 'critical', {
        message: `Theme "${source}" radii scale must be non-negative and non-decreasing.`,
        source,
      });
    }
  }

  private auditDesignSystem(issues: VisualDesignAuditIssue[]): void {
    if (!this.designSystem) return;

    const tokens = this.designSystem.listTokens();
    if (tokens.length === 0) {
      this.addIssue(issues, 'component', 'warning', {
        message: 'Design system contains no tokens.',
        source: 'design-system',
      });
      return;
    }

    const tokenNames = new Set(tokens.map((token) => token.name));
    for (const requiredToken of REQUIRED_DESIGN_TOKENS) {
      if (!tokenNames.has(requiredToken)) {
        this.addIssue(issues, 'component', 'warning', {
          message: `Design system is missing required token "${requiredToken}".`,
          source: 'design-system',
        });
      }
    }

    const categories = tokens.map((token) => token.category);
    if (!categories.includes('color')) {
      this.addIssue(issues, 'component', 'warning', {
        message: 'Design system has no color tokens.',
        source: 'design-system',
      });
    }
  }

  private auditVisualPolish(issues: VisualDesignAuditIssue[]): void {
    if (!this.visualPolish) return;

    const snapshot = this.visualPolish.createSnapshot();
    if (!snapshot.activeThemeId || snapshot.activeThemeId.trim() === '') {
      this.addIssue(issues, 'theme', 'critical', {
        message: 'Visual polish system has no active theme.',
        source: 'visual-polish',
      });
    }

    if (
      !snapshot.profile.colorblindSafe &&
      !snapshot.profile.highContrast
    ) {
      this.addIssue(issues, 'theme', 'info', {
        message:
          'Visual polish profile does not enable colorblind-safe or high-contrast mode.',
        source: 'visual-polish',
      });
    }
  }

  private addIssue(
    issues: VisualDesignAuditIssue[],
    category: VisualDesignAuditCategory,
    severity: UxAuditSeverity,
    data: { message: string; source?: string },
  ): void {
    assertNonEmpty(category, 'Visual design audit category');
    normalizeAuditSeverity(severity);
    assertNonEmpty(data.message, 'Visual design audit message');

    if (!isVisualDesignAuditCategory(category)) {
      throw new Error(`Invalid visual design audit category "${category}".`);
    }

    this.issueCounter += 1;
    issues.push({
      id: `visual-design-audit-${this.issueCounter}`,
      category,
      severity,
      message: data.message,
      source: data.source,
    });
  }

  private contrastRatio(foreground: string, background: string): number {
    const l1 = this.relativeLuminance(foreground);
    const l2 = this.relativeLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private relativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    const channel = (value: number): number => {
      const scaled = value / 255;
      return scaled <= 0.03928
        ? scaled / 12.92
        : Math.pow((scaled + 0.055) / 1.055, 2.4);
    };

    return (
      0.2126 * channel(rgb.r) +
      0.7152 * channel(rgb.g) +
      0.0722 * channel(rgb.b)
    );
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '');
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  private isStrictlyIncreasing(values: number[]): boolean {
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] <= values[index - 1]) {
        return false;
      }
    }
    return true;
  }

  private isNonDecreasing(values: number[]): boolean {
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] < values[index - 1]) {
        return false;
      }
    }
    return true;
  }

  private validateOptions(options: VisualDesignAuditSystemOptions): void {
    if (!isRecord(options)) {
      throw new Error('VisualDesignAuditSystem options must be an object.');
    }
    if (
      options.name !== undefined &&
      typeof options.name === 'string' &&
      options.name.trim() === ''
    ) {
      throw new Error('VisualDesignAuditSystem name cannot be empty if provided.');
    }
  }
}
