/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Barakah brand: Deep Islamic Green (600 = #075B46 primary)
        primary: {
          50: '#f0f7f4',
          100: '#dcebe4',
          200: '#b9d7ca',
          300: '#8cbca6',
          400: '#4f9e80',
          500: '#0b8062', // Secondary: Emerald Green
          600: '#075b46', // Primary: Deep Islamic Green
          700: '#064b3a',
          800: '#053b2e',
          900: '#043026',
          950: '#02201a',
        },
        // Accent: Warm Gold
        gold: {
          50: '#fbf7ee',
          100: '#f5ecd6',
          200: '#ebd8ab',
          300: '#dfc181',
          400: '#d6ae58', // Accent: Warm Gold
          500: '#c99a3e',
          600: '#a97f2f',
          700: '#866326',
          800: '#6b4e20',
          900: '#4a3617',
          950: '#2b1e0d',
        },
        // Soft Off-White app background + text/border tokens
        surface: '#f7f9f6', // Background: Soft Off-White
        ink: '#202923', // Primary text: Dark Charcoal
        muted: '#78837d', // Secondary text: Muted Gray
        line: '#e5ece7', // Borders: Light Gray-Green
        sidebar: {
          DEFAULT: '#075b46',
          dark: '#043026',
          light: '#0b8062',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(7 91 70 / 0.04), 0 1px 3px 0 rgb(7 91 70 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(7 91 70 / 0.10), 0 2px 6px -2px rgb(7 91 70 / 0.06)',
        soft: '0 2px 8px -2px rgb(32 41 35 / 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
