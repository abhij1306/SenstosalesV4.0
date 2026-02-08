/**
 * useDesignSystem Hook
 *
 * Provides centralized access to the Odoo ERP design tokens.
 * Single source of truth - all values reference CSS custom properties.
 */
export function useDesignSystem() {
  const isDark = false;

  // CSS Variable-based colors (single source of truth from globals.css)
  const colors = {
    background: 'var(--color-background)',
    surface: 'var(--color-surface)',
    surfaceMuted: 'var(--color-surface-muted)',
    surfaceSubtle: 'var(--color-surface-subtle)',
    foreground: 'var(--color-foreground)',
    foregroundMuted: 'var(--color-foreground-muted)',
    foregroundSubtle: 'var(--color-foreground-subtle)',
    primary: 'var(--color-primary)',
    primaryHover: 'var(--color-primary-hover)',
    primarySubtle: 'var(--color-primary-subtle)',
    primaryForeground: 'var(--color-primary-foreground)',
    secondary: 'var(--color-secondary)',
    secondaryForeground: 'var(--color-secondary-foreground)',
    success: 'var(--color-success)',
    successSubtle: 'var(--color-success-subtle)',
    successForeground: 'var(--color-success-foreground)',
    warning: 'var(--color-warning)',
    warningSubtle: 'var(--color-warning-subtle)',
    warningForeground: 'var(--color-warning-foreground)',
    error: 'var(--color-error)',
    errorSubtle: 'var(--color-error-subtle)',
    errorForeground: 'var(--color-error-foreground)',
    info: 'var(--color-info)',
    infoSubtle: 'var(--color-info-subtle)',
    infoForeground: 'var(--color-info-foreground)',
    border: 'var(--color-border)',
    borderSubtle: 'var(--color-border-subtle)',
    borderStrong: 'var(--color-border-strong)',
    input: 'var(--color-input)',
    ring: 'var(--color-primary)',
  };

  const shadows = {
    0: 'none',
    1: 'var(--shadow-card)',
    2: 'var(--shadow-elevated)',
    3: 'var(--shadow-elevated)',
  };

  const radius = {
    none: 'var(--radius-none)',
    xs: 'var(--radius-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  };

  const spacing = {
    0: 'var(--spacing-0)',
    1: 'var(--spacing-1)',
    2: 'var(--spacing-2)',
    3: 'var(--spacing-3)',
    4: 'var(--spacing-4)',
    5: 'var(--spacing-5)',
    6: 'var(--spacing-6)',
    8: 'var(--spacing-8)',
    10: 'var(--spacing-10)',
    12: 'var(--spacing-12)',
  };

  const typography = {
    fonts: {
      sans: 'var(--font-sans)',
      heading: 'var(--font-heading)',
      mono: 'var(--font-mono)',
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    sizes: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
    },
    display: {
      fontFamily: 'var(--font-sans)',
      fontSize: '30px',
      fontWeight: 600,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
    },
    headline: {
      fontFamily: 'var(--font-sans)',
      fontSize: '22px',
      fontWeight: 600,
      lineHeight: '30px',
      letterSpacing: '-0.02em',
    },
    title: {
      fontFamily: 'var(--font-sans)',
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: '24px',
      letterSpacing: '-0.01em',
    },
    subtitle: {
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '20px',
      letterSpacing: '-0.01em',
    },
    body: {
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: '20px',
      letterSpacing: '-0.01em',
    },
    bodyMedium: {
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: '20px',
      letterSpacing: '-0.01em',
    },
    bodySmall: {
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: '18px',
      letterSpacing: '0em',
    },
    label: {
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: '16px',
      letterSpacing: '0em',
    },
    labelCaps: {
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
      fontWeight: 600,
      lineHeight: '14px',
      letterSpacing: '0.03em',
      textTransform: 'uppercase' as const,
    },
    meta: {
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
      fontWeight: 400,
      lineHeight: '14px',
      letterSpacing: '0.01em',
    },
  };

  // Pre-built style objects using CSS variables
  const styles = {
    card: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.sm,
      boxShadow: shadows[1],
    },
    button: {
      primary: {
        backgroundColor: colors.primary,
        color: colors.primaryForeground,
        borderRadius: radius.sm,
      },
      secondary: {
        backgroundColor: colors.surface,
        color: colors.foregroundMuted,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: radius.sm,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.primary,
        borderRadius: radius.sm,
      },
      danger: {
        backgroundColor: colors.error,
        color: colors.errorForeground,
        borderRadius: radius.sm,
      },
    },
  };

  return {
    isDark,
    colors,
    shadows,
    typography,
    spacing,
    radius,
    styles,
  };
}
