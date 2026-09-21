// Identidad visual FRIKIDEX v0.2 — ver docs/01-IDENTIDAD-VISUAL.md (fuente de verdad).
// Modo oscuro es el default de la app; el set `light` queda listo para un futuro
// toggle de modo claro pero hoy ninguna pantalla lo usa todavía.
//
// NOTA: la spec no define un color de borde propio para modo oscuro (solo lo hace
// para modo claro, #D9D1C0), así que `border` reutiliza "Superficie elevada"
// (#2E2752), que ya es más clara que `surface` y por lo tanto se distingue bien.

export const colors = {
  background: '#16122B', // Noche
  backgroundDeep: '#0F0C1F', // Noche profundo — fondo tras tarjetas / cámara de escaneo
  surface: '#221C3D', // Superficie tarjeta
  surfaceElevated: '#2E2752', // Placeholders de foto, inputs, elementos dentro de tarjetas
  border: '#2E2752',

  text: '#F5F0E6', // Principal sobre Noche
  textSecondary: '#CFC8E6',
  textMuted: '#A79FC4', // Terciario: etiquetas, metadatos, placeholders

  onSecondaryTitle: '#FFFFFF', // Texto sobre violeta: títulos
  onSecondaryBody: '#F1ECFF', // Texto sobre violeta: párrafos

  primary: '#C6F432', // Lima escáner — CTA principal, el "DEX", brackets de escaneo
  primaryHover: '#E2FF8A',
  primaryText: '#16122B', // El texto sobre lima SIEMPRE va en Noche

  secondary: '#6D4AFF', // Violeta Frikidex — marca, íconos, botones secundarios
  secondaryHover: '#4B2FD6',

  danger: '#FF6B57', // Coral — SOLO uso funcional: "¡Ya lo tienes!", duplicados, errores, destructivo
  dangerText: '#16122B',

  disabledBg: '#2E2752',
  disabledText: '#A79FC4',

  white: '#FFFFFF',

  light: {
    background: '#F5F0E6', // Papel cómic
    backgroundAlt: '#EDE7DA',
    surface: '#FFFFFF',
    border: '#D9D1C0',
    text: '#16122B',
    textSecondary: '#3E3856',
    textMuted: '#5B5470',
    disabledBg: '#EDE7DA',
    disabledText: '#5B5470',
  },
} as const;

export const radius = {
  card: 24, // tarjetas grandes
  cardMedium: 20, // tarjetas internas o medianas
  image: 14, // imágenes / thumbnails
  control: 14, // botones e inputs
  pill: 999, // badges / pills
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screenPadding: 20,
} as const;

// Nombres de familia tal como los exportan @expo-google-fonts/bungee y
// @expo-google-fonts/dm-sans — deben cargarse con useFonts() antes de usarse.
export const typography = {
  fontFamily: {
    display: 'Bungee_400Regular', // Logotipo, títulos, botones, número de ficha. SOLO mayúsculas, nunca párrafos.
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodyBold: 'DMSans_700Bold',
  },
  size: {
    screenTitle: 30,
    sectionTitle: 22,
    button: 17,
    fichaNumber: 14,
    body: 16,
    cardTitle: 19,
    metadata: 14,
    badge: 13,
    sectionLabel: 13,
  },
} as const;
