export type UIThemeMode = 'light' | 'dark' | 'high-contrast';

export interface UIThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  border: string;
}

export interface UIThemeTypography {
  fontFamily: string;
  baseSize: number;
  lineHeight: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
}

export interface UIThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface UIThemeMotion {
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
  easing: string;
}

export interface UIThemeRadii {
  small: number;
  medium: number;
  large: number;
}

export interface UIThemeTokens {
  colors: UIThemeColors;
  typography: UIThemeTypography;
  spacing: UIThemeSpacing;
  motion: UIThemeMotion;
  radii: UIThemeRadii;
}

export interface UIThemeDefinition {
  id: string;
  name: string;
  mode: UIThemeMode;
  tokens: UIThemeTokens;
}

const DARK_THEME: UIThemeDefinition = {
  id: 'cyre-dark',
  name: 'CYRE Dark',
  mode: 'dark',
  tokens: {
    colors: {
      background: '#0b0f17',
      surface: '#111827',
      primary: '#22d3ee',
      secondary: '#64748b',
      accent: '#f59e0b',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      success: '#22c55e',
      warning: '#f97316',
      danger: '#ef4444',
      info: '#3b82f6',
      border: '#1f2937',
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      baseSize: 14,
      lineHeight: 1.5,
      h1Size: 28,
      h2Size: 22,
      h3Size: 18,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    motion: {
      durationFast: 120,
      durationNormal: 240,
      durationSlow: 400,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
    radii: {
      small: 4,
      medium: 8,
      large: 12,
    },
  },
};

const LIGHT_THEME: UIThemeDefinition = {
  id: 'cyre-light',
  name: 'CYRE Light',
  mode: 'light',
  tokens: {
    colors: {
      background: '#f8fafc',
      surface: '#ffffff',
      primary: '#0891b2',
      secondary: '#475569',
      accent: '#d97706',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      success: '#16a34a',
      warning: '#ea580c',
      danger: '#dc2626',
      info: '#2563eb',
      border: '#e2e8f0',
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      baseSize: 14,
      lineHeight: 1.5,
      h1Size: 28,
      h2Size: 22,
      h3Size: 18,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    motion: {
      durationFast: 120,
      durationNormal: 240,
      durationSlow: 400,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
    radii: {
      small: 4,
      medium: 8,
      large: 12,
    },
  },
};

const DEFAULT_THEMES: UIThemeDefinition[] = [DARK_THEME, LIGHT_THEME];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export class UIThemeManager {
  private readonly themes = new Map<string, UIThemeDefinition>();
  private activeThemeId: string;

  constructor(themes: UIThemeDefinition[] = DEFAULT_THEMES) {
    for (const theme of themes) {
      this.validateTheme(theme);
      if (this.themes.has(theme.id)) {
        throw new Error(`UI theme "${theme.id}" already exists.`);
      }
      this.themes.set(theme.id, this.copyTheme(theme));
    }

    const firstTheme = themes[0];
    if (!firstTheme) {
      throw new Error('UIThemeManager requires at least one theme.');
    }

    this.activeThemeId = firstTheme.id;
  }

  listThemes(): UIThemeDefinition[] {
    return [...this.themes.values()].map((theme) => this.copyTheme(theme));
  }

  getActiveThemeId(): string {
    return this.activeThemeId;
  }

  getActiveTheme(): UIThemeDefinition {
    return this.copyTheme(this.getRequiredTheme(this.activeThemeId));
  }

  activateTheme(themeId: string): void {
    if (!this.themes.has(themeId)) {
      throw new Error(`UI theme "${themeId}" does not exist.`);
    }
    this.activeThemeId = themeId;
  }

  getColor(tokenName: keyof UIThemeColors): string {
    return this.getActiveTheme().tokens.colors[tokenName];
  }

  getSpacing(tokenName: keyof UIThemeSpacing): number {
    return this.getActiveTheme().tokens.spacing[tokenName];
  }

  getRadius(tokenName: keyof UIThemeRadii): number {
    return this.getActiveTheme().tokens.radii[tokenName];
  }

  setColor(themeId: string, tokenName: keyof UIThemeColors, value: string): void {
    const theme = this.getRequiredTheme(themeId);
    if (!HEX_COLOR_PATTERN.test(value)) {
      throw new Error(`UI theme color "${value}" must be a six-digit hex color.`);
    }
    theme.tokens.colors[tokenName] = value;
  }

  private getRequiredTheme(themeId: string): UIThemeDefinition {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`UI theme "${themeId}" does not exist.`);
    }
    return theme;
  }

  private validateTheme(theme: UIThemeDefinition): void {
    if (!theme.id || theme.id.trim() === '') {
      throw new Error('UI theme id is required.');
    }
    if (!theme.name || theme.name.trim() === '') {
      throw new Error('UI theme name is required.');
    }
    if (!['light', 'dark', 'high-contrast'].includes(theme.mode)) {
      throw new Error(`Invalid UI theme mode "${theme.mode}".`);
    }
    if (!theme.tokens || typeof theme.tokens !== 'object') {
      throw new Error('UI theme tokens are required.');
    }
    for (const color of Object.values(theme.tokens.colors)) {
      if (!HEX_COLOR_PATTERN.test(color)) {
        throw new Error(`UI theme color "${color}" must be a six-digit hex color.`);
      }
    }
  }

  private copyTheme(theme: UIThemeDefinition): UIThemeDefinition {
    return {
      id: theme.id,
      name: theme.name,
      mode: theme.mode,
      tokens: JSON.parse(JSON.stringify(theme.tokens)),
    };
  }
}
