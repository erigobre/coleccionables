// Colors/radius/fontFamily here must stay in sync with src/theme/tokens.ts (kept in
// JS here because this file is loaded directly by Node, not through Metro/TS).
// Fuente de verdad de la identidad visual: docs/01-IDENTIDAD-VISUAL.md.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#16122B',
        backgroundDeep: '#0F0C1F',
        surface: '#221C3D',
        surfaceElevated: '#2E2752',
        border: '#2E2752',
        text: '#F5F0E6',
        textSecondary: '#CFC8E6',
        textMuted: '#A79FC4',
        onSecondaryTitle: '#FFFFFF',
        onSecondaryBody: '#F1ECFF',
        primary: '#C6F432',
        primaryHover: '#E2FF8A',
        primaryText: '#16122B',
        secondary: '#6D4AFF',
        secondaryHover: '#4B2FD6',
        danger: '#FF6B57',
        dangerText: '#16122B',
        disabledBg: '#2E2752',
        disabledText: '#A79FC4',
        white: '#FFFFFF',
        light: {
          background: '#F5F0E6',
          backgroundAlt: '#EDE7DA',
          surface: '#FFFFFF',
          border: '#D9D1C0',
          text: '#16122B',
          textSecondary: '#3E3856',
          textMuted: '#5B5470',
          disabledBg: '#EDE7DA',
          disabledText: '#5B5470',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '24px',
        pill: '999px',
      },
      fontFamily: {
        display: ['Bungee_400Regular'],
        body: ['DMSans_400Regular'],
        'body-medium': ['DMSans_500Medium'],
        'body-bold': ['DMSans_700Bold'],
      },
    },
  },
  plugins: [],
};
