// Nest Design System
// Dark theme only. Everything references these variables — never hardcode a color or size.

export const colors = {
  // Backgrounds
  bg:         '#0e0e0c',   // App background
  bg2:        '#161614',   // Cards, surfaces
  bg3:        '#1e1e1b',   // Elevated cards
  bg4:        '#262622',   // Inputs, tags
  line:       '#2c2c28',   // Borders, dividers

  // Text
  text:       '#f0f0e8',   // Primary text
  sub:        '#999992',   // Secondary text
  muted:      '#666660',   // Placeholders, labels

  // Accent (numbers, CTAs)
  accent:     '#e8c547',
  accentDim:  '#3d3310',

  // Semantic
  green:      '#4caf7d',   // Success, profit, good score
  greenDim:   '#0e2e1a',
  amber:      '#e8960a',   // Warning, watch
  amberDim:   '#2e1e04',
  red:        '#e05555',   // Error, loss, urgent
  redDim:     '#2e0e0e',
  blue:       '#4a9edd',   // Info, cashier role
  blueDim:    '#0a1e2e',
}

export const typography = {
  // Font families (system fonts as fallback)
  display:    'System',
  body:       'System',
  mono:       'Courier',  // ALL money values

  // Sizes
  xs:   10,
  sm:   12,
  base: 14,
  lg:   16,
  xl:   20,
  xxl:  28,
  hero: 44,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
}

// RULE: All money displayed with mono font + KES prefix
// RULE: All amounts stored as integers (cents) — divide by 100 for display
export const formatMoney = (cents: number): string =>
  `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatMoneyShort = (cents: number): string =>
  `KES ${(cents / 100).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`

// Utility for date formatting
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
