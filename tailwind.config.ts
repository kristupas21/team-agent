import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 500: '#2563eb', 700: '#1d4ed8' },
        secondary: { 50: '#f5f3ff', 500: '#7c3aed', 700: '#5b21b6' },
        neutral: {
          50: '#f9fafb',
          200: '#e5e7eb',
          500: '#6b7280',
          700: '#374151',
          900: '#111827',
        },
        danger: { 50: '#fef2f2', 500: '#dc2626', 700: '#b91c1c' },
        success: { 50: '#f0fdf4', 500: '#16a34a', 700: '#15803d' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['1.2rem', { lineHeight: '1.6rem' }],
        sm: ['1.4rem', { lineHeight: '2.0rem' }],
        base: ['1.6rem', { lineHeight: '2.4rem' }],
        lg: ['1.8rem', { lineHeight: '2.8rem' }],
        xl: ['2.0rem', { lineHeight: '2.8rem' }],
        '2xl': ['2.4rem', { lineHeight: '3.2rem' }],
        '3xl': ['3.0rem', { lineHeight: '3.6rem' }],
        '4xl': ['3.6rem', { lineHeight: '4.0rem' }],
      },
      spacing: {
        0: '0',
        1: '0.4rem',
        2: '0.8rem',
        3: '1.2rem',
        4: '1.6rem',
        5: '2.0rem',
        6: '2.4rem',
        8: '3.2rem',
        10: '4.0rem',
        12: '4.8rem',
        16: '6.4rem',
        20: '8.0rem',
        24: '9.6rem',
      },
    },
  },
  plugins: [],
}

export default config
