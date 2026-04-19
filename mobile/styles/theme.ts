// Nest Design System
// Colors, typography, and spacing for consistent UI

export const Colors = {
  // Primary palette
  primary: '#0D47A1',
  primaryLight: '#1565C0',
  primaryDark: '#0A357A',
  
  // Secondary
  secondary: '#00C853',
  secondaryLight: '#00E676',
  secondaryDark: '#00A344',
  
  // Semantic colors
  success: '#00C853',
  warning: '#FFAB00',
  error: '#DD2C00',
  info: '#0091EA',
  
  // Neutrals
  white: '#FFFFFF',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  
  // Text
  text: '#1A1A2E',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  
  // Financial colors
  revenue: '#00C853',
  expense: '#DD2C00',
  savings: '#0D47A1',
  cash: '#FFAB00',
};

export const Typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    xxxxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Component-specific styles
export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  secondary: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
};

export const CardStyles = {
  default: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
};
