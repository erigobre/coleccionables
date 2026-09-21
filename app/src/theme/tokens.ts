// Identidad visual v1 — premium, neutra, glassmorphism (Apple/Instagram style).
// Un solo tema claro por ahora; el modo oscuro se puede agregar después sin romper
// esta estructura (colors.dark ya reservado para eso).

export const colors = {
  background: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEDE8',
  border: '#E4E1DA',
  text: '#1C1B19',
  textMuted: '#6B685F',
  primary: '#7C5CFC',
  primaryMuted: '#EFEAFF',
  accent: '#FF7A59',
  success: '#2FAE60',
  danger: '#E5484D',
  warning: '#F5A524',
  glassTint: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.35)',
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
  },
} as const;
