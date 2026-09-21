// Colors/radius here must stay in sync with src/theme/tokens.ts (kept in JS here
// because this file is loaded directly by Node, not through Metro/TS).

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
